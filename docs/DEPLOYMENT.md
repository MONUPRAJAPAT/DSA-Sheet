# Deployment (AWS)

The **live demo** runs on AWS in **ap-southeast-2 (Sydney)** — the Region AWS assigned to this account (new AWS experience accounts are pinned to one Region) — at **https://dd2dekdh8uhzz.cloudfront.net**. Static pages are served from CloudFront edge locations in India; only API calls travel to Sydney (~0.3 s round trip). The production design targets **ap-south-1 (Mumbai)**, closest to the students. The database is MongoDB Atlas on AWS in the same Region as the API.

```
Browser ──HTTPS──► CloudFront ──┬── /*      ──► S3 (React build, private, Origin Access Control)
                                └── /api/*  ──► ALB ──► ECS Fargate (2–6 API tasks) ──► MongoDB Atlas
```

Everything is defined as code in [`infra/aws/stack.yml`](../infra/aws/stack.yml) (CloudFormation, validated with `cfn-lint`). One command deploys it: [`infra/aws/deploy.sh`](../infra/aws/deploy.sh).

## Two deployment profiles

| Profile            | Template                                        | Architecture                                                                                                               | Cost (Sydney, measured from the AWS Pricing API)                 | Use                                                            |
| ------------------ | ----------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------- | -------------------------------------------------------------- |
| **lite** (default) | [`stack-lite.yml`](../infra/aws/stack-lite.yml) | CloudFront → S3 (SPA) and → **one Graviton EC2 (t4g.micro)** running the API container; secrets in SSM; logs in CloudWatch | **≈ $12 / month** (EC2 $7.7, public IPv4 $3.7, storage/logs ~$1) | The live demo; fits entirely inside the AWS Free plan credits  |
| **production**     | [`stack.yml`](../infra/aws/stack.yml)           | CloudFront → S3 and → **ALB → autoscaling ECS Fargate (2–6 tasks, 2 AZs)**                                                 | ≈ $82 / month at 2 tasks                                         | The design for 10k–50k students described in the system design |

Both share the same Docker image, secrets layout, CloudFront single-origin routing and origin protection. The lite profile drops the load balancer: CloudFront talks to the instance directly, its security group only admits CloudFront's IP ranges, and the API itself rejects any request without the secret `X-Origin-Verify` header. Updates are rolled out with **SSM Run Command**, so the server has no SSH port.

```bash
AWS_PROFILE=dsa ./infra/aws/deploy.sh secrets   # Atlas URI (hidden input) + generated JWT / origin secrets → SSM
AWS_PROFILE=dsa ./infra/aws/deploy.sh           # lite: build arm64 image → ECR → CloudFormation → S3 → CloudFront
AWS_PROFILE=dsa ./infra/aws/deploy.sh seed      # content + demo account
AWS_PROFILE=dsa ./infra/aws/deploy.sh status    # URL and resource ids
AWS_PROFILE=dsa ./infra/aws/deploy.sh destroy   # remove everything
DEPLOY_TARGET=production AWS_PROFILE=dsa ./infra/aws/deploy.sh   # the full production stack
```

The Region comes from the AWS CLI profile. Accounts on the _new AWS experience_ are pinned to one Region (this project's is `ap-southeast-2`), and MongoDB Atlas should be created in the same Region.

---

## Production profile details

## What gets created

| Resource                                         | Purpose                                                                                                                                                                                                                                 |
| ------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| VPC, 2 public subnets in 2 AZs, Internet Gateway | Network across two availability zones                                                                                                                                                                                                   |
| Application Load Balancer                        | Health-checked routing to API tasks. **Only reachable through CloudFront**: its security group allows only CloudFront's origin-facing IP ranges, and the listener forwards only requests that carry the secret `X-Origin-Verify` header |
| ECS cluster + Fargate service                    | Stateless API containers (0.5 vCPU / 1 GB), rolling deploys with automatic rollback (circuit breaker), CPU target-tracking autoscaling 2 → 6 tasks                                                                                      |
| ECR repository                                   | API images, scanned on push, last 10 kept                                                                                                                                                                                               |
| S3 bucket                                        | Private bucket for the SPA, encrypted, all public access blocked                                                                                                                                                                        |
| CloudFront distribution                          | HTTPS, HTTP/2 + HTTP/3, Brotli/gzip, security headers, SPA routing function, `/api/*` behaviour with a no-cache policy that forwards `Authorization`, cookies and `X-Timezone`                                                          |
| SSM Parameter Store (SecureString)               | `MONGODB_URI`, `JWT_ACCESS_SECRET`, origin-verify secret. They are injected into containers at start and never stored in the image or the repository                                                                                    |
| CloudWatch Logs                                  | Structured JSON API logs, 30-day retention, Container Insights metrics                                                                                                                                                                  |

## Prerequisites

1. An AWS account and the **AWS CLI v2** configured (`aws configure`) with an admin or deployer role.
2. **Docker** and **Node.js 20+**.
3. A **MongoDB Atlas** cluster on AWS in the **same Region as your stack** (Sydney `ap-southeast-2` for this account):
   - M0 (free) is fine for the demo. Use M10+ for real traffic (backups, dedicated resources).
   - Create a database user with a strong password.
   - Network access: Fargate tasks get public IPs that change on every deploy, so allow `0.0.0.0/0` for the demo (traffic is still TLS and authenticated). For production, see _Hardening_ below.
   - Copy the connection string, e.g. `mongodb+srv://dsa:<password>@cluster0.xxxxx.mongodb.net/dsa-sheet?retryWrites=true&w=majority`.

## Steps

```bash
# 1. One-time: store secrets (prompts for the Atlas URI; generates a 384-bit JWT secret)
./infra/aws/deploy.sh secrets

# 2. Build, push and deploy everything (~10 min on first run; CloudFront creation is the slow part)
./infra/aws/deploy.sh

# 3. One-time: load the sheet content and demo account into Atlas
./infra/aws/deploy.sh seed
```

The script prints the live URL, `https://dxxxxxxxxxxxx.cloudfront.net`, and runs a health-check smoke test.

Re-running `./infra/aws/deploy.sh` performs a **zero-downtime rolling deploy**:

1. The new image is built and pushed.
2. ECS starts new tasks, waits for them to pass the ALB health check, then drains the old ones.
3. If the new tasks never become healthy, the deployment **rolls back automatically**.
4. The SPA is uploaded: hashed assets are cached for a year as immutable, while `index.html` is `no-cache`.
5. CloudFront is invalidated.

## CI/CD (GitHub Actions)

| Workflow                                        | Trigger            | What it does                                                                                                             |
| ----------------------------------------------- | ------------------ | ------------------------------------------------------------------------------------------------------------------------ |
| [`ci.yml`](../.github/workflows/ci.yml)         | Every push / PR    | Typecheck, 26 API integration tests (in-memory MongoDB), client build, Docker build, Playwright E2E against a real stack |
| [`deploy.yml`](../.github/workflows/deploy.yml) | CI green on `main` | Assumes an AWS role via **OIDC** (no long-lived keys in GitHub) and runs `deploy.sh`                                     |
| [`links.yml`](../.github/workflows/links.yml)   | Weekly             | Re-validates all 717 content links against YouTube / LeetCode / Codeforces / article sites                               |

To enable auto-deploy:

1. Create an IAM role trusted by `token.actions.githubusercontent.com` for this repository.
2. Save its ARN as the `AWS_DEPLOY_ROLE_ARN` secret in a GitHub environment named `production`.

## Custom domain (optional)

1. Request an ACM certificate in **us-east-1** for `dsa.example.com`.
2. Add `Aliases` and `ViewerCertificate` to the distribution in `stack.yml`.
3. Point a Route 53 alias (or CNAME) at the distribution.

## Monthly cost estimate (demo scale)

| Item                               | ≈ USD / month            |
| ---------------------------------- | ------------------------ |
| Fargate: 2 tasks × 0.5 vCPU / 1 GB | 18                       |
| Application Load Balancer          | 18                       |
| CloudFront + S3 (low traffic)      | 1–2                      |
| CloudWatch Logs                    | 1                        |
| MongoDB Atlas M0 / M10             | 0 / 57                   |
| **Total**                          | **≈ 38 (M0) – 95 (M10)** |

To tear everything down: `aws cloudformation delete-stack --stack-name dsa-sheet`. Empty the S3 bucket first, then delete the ECR repository.

## Hardening for real production

- **Fixed egress IP for Atlas:** move tasks to private subnets behind a NAT Gateway with an Elastic IP and allowlist only that IP. Even better, use **Atlas PrivateLink**, so traffic never leaves AWS.
- **AWS WAF** on CloudFront with the managed common rule set and a rate-based rule. This complements the app's per-IP limits.
- **Redis (ElastiCache)** as a shared store for rate limits and the sheet cache once there are many tasks.
- **Alarms:** ALB 5xx rate, p95 target response time, ECS CPU and memory, Atlas connections, all sent to SNS → email/Slack.
