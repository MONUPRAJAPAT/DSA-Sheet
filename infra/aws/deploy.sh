#!/usr/bin/env bash
# DSA Sheet — AWS deployment (runs from your machine; no CI required).
#
#   AWS_PROFILE=dsa ./infra/aws/deploy.sh secrets   # one-time: MongoDB URI + generated secrets → SSM Parameter Store
#   AWS_PROFILE=dsa ./infra/aws/deploy.sh           # build & push the API image, deploy infra, upload the SPA
#   AWS_PROFILE=dsa ./infra/aws/deploy.sh seed      # load sheet content + demo account into the database
#   AWS_PROFILE=dsa ./infra/aws/deploy.sh status    # print the live URL and resource ids
#   AWS_PROFILE=dsa ./infra/aws/deploy.sh destroy   # delete everything this script created
#
# DEPLOY_TARGET=lite (default)  → stack-lite.yml: CloudFront + S3 + one Graviton EC2 running Docker (~$12/month)
# DEPLOY_TARGET=production      → stack.yml:      CloudFront + S3 + ALB + autoscaling ECS Fargate (see docs)
#
# Requires: AWS CLI v2 (signed in via `aws login` or `aws configure`), Docker, Node 20+.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
APP="dsa-sheet"
TARGET="${DEPLOY_TARGET:-lite}"
REGION="${AWS_REGION:-$(aws configure get region 2>/dev/null || true)}"
if [ -z "$REGION" ]; then
  # Never guess: deploying to the wrong Region silently creates a second copy of everything.
  echo "No AWS Region configured. Set one with: aws configure set region <region> --profile ${AWS_PROFILE:-default}"
  exit 1
fi
export AWS_REGION="$REGION" AWS_DEFAULT_REGION="$REGION" AWS_PAGER=""
echo "AWS profile: ${AWS_PROFILE:-default} · Region: $REGION · Target: $TARGET"

case "$TARGET" in
  lite) STACK="${STACK_NAME:-$APP-lite}"; TEMPLATE="$ROOT/infra/aws/stack-lite.yml"; PLATFORM="linux/arm64" ;;
  production) STACK="${STACK_NAME:-$APP}"; TEMPLATE="$ROOT/infra/aws/stack.yml"; PLATFORM="linux/amd64" ;;
  *) echo "DEPLOY_TARGET must be 'lite' or 'production'"; exit 1 ;;
esac

log() { printf '\n\033[1;34m▶ %s\033[0m\n' "$*"; }
ok() { printf '\033[1;32m✔ %s\033[0m\n' "$*"; }
param() { aws ssm get-parameter --name "$1" --with-decryption --query Parameter.Value --output text 2>/dev/null || true; }
output() { aws cloudformation describe-stacks --stack-name "$STACK" --query "Stacks[0].Outputs[?OutputKey=='$1'].OutputValue" --output text; }
random_hex() { node -e "console.log(require('crypto').randomBytes($1).toString('hex'))"; }

cmd_secrets() {
  log "Storing secrets in SSM Parameter Store ($REGION)"
  echo "Paste your MongoDB Atlas connection string (input is hidden):"
  read -rs MONGO
  echo
  # Validate and make sure the URI names the dsa-sheet database.
  MONGO="$(MONGO="$MONGO" node -e '
    const raw = process.env.MONGO.trim();
    if (!/^mongodb(\+srv)?:\/\//.test(raw)) { console.error("That does not look like a MongoDB connection string."); process.exit(1); }
    if (/<[^>]*password[^>]*>/i.test(raw)) { console.error("Replace <db_password> with your real database password first."); process.exit(1); }
    const u = new URL(raw);
    if (u.pathname === "" || u.pathname === "/") u.pathname = "/dsa-sheet";
    console.log(u.toString());
  ')"
  aws ssm put-parameter --name "/$APP/MONGODB_URI" --type SecureString --value "$MONGO" --overwrite >/dev/null
  if [ -z "$(param "/$APP/JWT_ACCESS_SECRET")" ]; then
    aws ssm put-parameter --name "/$APP/JWT_ACCESS_SECRET" --type SecureString --value "$(random_hex 48)" >/dev/null
  fi
  if [ -z "$(param "/$APP/ORIGIN_VERIFY")" ]; then
    aws ssm put-parameter --name "/$APP/ORIGIN_VERIFY" --type SecureString --value "$(random_hex 24)" >/dev/null
  fi
  ok "Secrets stored (/$APP/MONGODB_URI, /$APP/JWT_ACCESS_SECRET, /$APP/ORIGIN_VERIFY)"
}

cmd_seed() {
  log "Seeding the database (content + demo account)"
  MONGO="$(param "/$APP/MONGODB_URI")"
  [ -n "$MONGO" ] || { echo "Run '$0 secrets' first"; exit 1; }
  (cd "$ROOT/server" && NODE_ENV=production LOG_LEVEL=info MONGODB_URI="$MONGO" JWT_ACCESS_SECRET="$(param "/$APP/JWT_ACCESS_SECRET")" npx tsx src/seed/seed.ts)
  ok "Database seeded"
}

wait_for_ssm() {
  local id="$1"
  for _ in $(seq 1 40); do
    [ "$(aws ssm describe-instance-information --filters "Key=InstanceIds,Values=$id" --query 'InstanceInformationList[0].PingStatus' --output text 2>/dev/null)" = "Online" ] && return 0
    sleep 15
  done
  echo "Instance $id did not register with SSM in time"; return 1
}

restart_lite_api() {
  local id
  id="$(output InstanceId)"
  log "Rolling out the new image on $id"
  wait_for_ssm "$id"
  local cmd
  cmd="$(aws ssm send-command --instance-ids "$id" --document-name AWS-RunShellScript \
    --parameters 'commands=["/opt/dsa-sheet/run.sh"]' --comment "deploy $TAG" --query Command.CommandId --output text)"
  aws ssm wait command-executed --command-id "$cmd" --instance-id "$id" || {
    aws ssm get-command-invocation --command-id "$cmd" --instance-id "$id" --query '[StandardOutputContent,StandardErrorContent]' --output text | tail -30
    exit 1
  }
  ok "API container restarted with $TAG"
}

cmd_deploy() {
  [ -n "$(param "/$APP/MONGODB_URI")" ] || { echo "Missing secrets — run '$0 secrets' first"; exit 1; }
  ACCOUNT="$(aws sts get-caller-identity --query Account --output text)"
  REGISTRY="$ACCOUNT.dkr.ecr.$REGION.amazonaws.com"
  REPO="$APP-api"
  TAG="$(git -C "$ROOT" rev-parse --short HEAD 2>/dev/null || date +%Y%m%d%H%M%S)-$(date +%s)"
  IMAGE="$REGISTRY/$REPO:$TAG"
  echo "Account $ACCOUNT · Region $REGION · Target $TARGET · Stack $STACK"

  log "Container registry (ECR)"
  if ! aws ecr describe-repositories --repository-names "$REPO" >/dev/null 2>&1; then
    aws ecr create-repository --repository-name "$REPO" --image-scanning-configuration scanOnPush=true >/dev/null
    aws ecr put-lifecycle-policy --repository-name "$REPO" --lifecycle-policy-text \
      '{"rules":[{"rulePriority":1,"description":"keep last 10","selection":{"tagStatus":"any","countType":"imageCountMoreThan","countNumber":10},"action":{"type":"expire"}}]}' >/dev/null
  fi
  aws ecr get-login-password | docker login --username AWS --password-stdin "$REGISTRY" >/dev/null
  ok "ECR repository $REPO ready"

  log "Build & push API image ($PLATFORM)"
  docker build --platform "$PLATFORM" -f "$ROOT/server/Dockerfile" -t "$IMAGE" "$ROOT"
  docker push "$IMAGE"
  aws ssm put-parameter --name "/$APP/IMAGE_URI" --type String --value "$IMAGE" --overwrite >/dev/null
  ok "Pushed $IMAGE"

  log "Infrastructure (CloudFormation: $STACK)"
  EXISTED=false
  aws cloudformation describe-stacks --stack-name "$STACK" >/dev/null 2>&1 && EXISTED=true
  VERIFY="$(param "/$APP/ORIGIN_VERIFY")"
  PREFIX_LIST="$(aws ec2 describe-managed-prefix-lists --filters Name=prefix-list-name,Values=com.amazonaws.global.cloudfront.origin-facing --query 'PrefixLists[0].PrefixListId' --output text)"
  if [ "$TARGET" = lite ]; then
    OVERRIDES=(OriginVerifySecret="$VERIFY" CloudFrontPrefixListId="$PREFIX_LIST")
  else
    OVERRIDES=(ImageUri="$IMAGE" OriginVerifySecret="$VERIFY" CloudFrontPrefixListId="$PREFIX_LIST")
  fi
  aws cloudformation deploy --stack-name "$STACK" --template-file "$TEMPLATE" --capabilities CAPABILITY_IAM \
    --no-fail-on-empty-changeset --parameter-overrides "${OVERRIDES[@]}"
  ok "Stack $STACK is up to date"

  if [ "$TARGET" = lite ]; then
    # A brand-new instance starts the container from its boot script; existing ones are told to update.
    if [ "$EXISTED" = true ]; then restart_lite_api; fi
  else
    log "Waiting for the ECS service to become stable"
    aws ecs wait services-stable --cluster "$(output ClusterName)" --services "$(output ServiceName)"
  fi

  log "Build & upload the web app"
  (cd "$ROOT" && { [ -d node_modules ] || npm ci --no-audit --no-fund >/dev/null; } && npm run build -w client >/dev/null)
  BUCKET="$(output SiteBucketName)"
  aws s3 sync "$ROOT/client/dist/assets" "s3://$BUCKET/assets" --delete --cache-control "public,max-age=31536000,immutable" --only-show-errors
  aws s3 sync "$ROOT/client/dist" "s3://$BUCKET" --delete --exclude "assets/*" --cache-control "no-cache" --only-show-errors
  aws cloudfront create-invalidation --distribution-id "$(output DistributionId)" --paths "/index.html" "/" >/dev/null
  ok "Web app uploaded to s3://$BUCKET"

  URL="$(output AppUrl)"
  log "Smoke test: $URL/api/v1/health (the first deploy can take ~10 min while CloudFront and the server start)"
  for _ in $(seq 1 60); do
    if curl -fsS "$URL/api/v1/health" 2>/dev/null | grep -q '"ok"'; then
      curl -fsS "$URL/api/v1/health"; echo
      printf '\n\033[1;32m✅ Deployed: %s\033[0m\n   API docs: %s/api/docs\n' "$URL" "$URL"
      return 0
    fi
    sleep 10
  done
  echo "⚠️  Health check did not pass yet. Check logs: aws logs tail /$APP/api --follow"
  exit 1
}

cmd_status() {
  aws cloudformation describe-stacks --stack-name "$STACK" --query 'Stacks[0].[StackStatus,Outputs]' --output table
}

cmd_destroy() {
  read -r -p "Delete stack '$STACK', its S3 website files and the ECR images? Type the stack name to confirm: " CONFIRM
  [ "$CONFIRM" = "$STACK" ] || { echo "Cancelled."; exit 1; }
  BUCKET="$(output SiteBucketName 2>/dev/null || true)"
  [ -n "$BUCKET" ] && [ "$BUCKET" != "None" ] && aws s3 rm "s3://$BUCKET" --recursive --only-show-errors
  aws cloudformation delete-stack --stack-name "$STACK"
  aws cloudformation wait stack-delete-complete --stack-name "$STACK"
  aws ecr delete-repository --repository-name "$APP-api" --force >/dev/null 2>&1 || true
  ok "Deleted. (Secrets in SSM /$APP/* are kept; delete them with: aws ssm delete-parameters --names /$APP/MONGODB_URI /$APP/JWT_ACCESS_SECRET /$APP/ORIGIN_VERIFY /$APP/IMAGE_URI)"
}

case "${1:-deploy}" in
  secrets) cmd_secrets ;;
  seed) cmd_seed ;;
  deploy) cmd_deploy ;;
  status) cmd_status ;;
  destroy) cmd_destroy ;;
  *) echo "usage: $0 [deploy|secrets|seed|status|destroy]"; exit 1 ;;
esac
