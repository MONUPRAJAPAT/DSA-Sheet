import {
  BookOpen,
  Brackets,
  GitBranch,
  Grid3x3,
  Hash,
  Layers,
  Link,
  MoveHorizontal,
  Network,
  Search,
  Triangle,
  Type,
  Waypoints,
  type LucideIcon,
} from 'lucide-react';

const ICONS: Record<string, LucideIcon> = {
  brackets: Brackets,
  type: Type,
  hash: Hash,
  'move-horizontal': MoveHorizontal,
  search: Search,
  'git-branch': GitBranch,
  link: Link,
  layers: Layers,
  triangle: Triangle,
  network: Network,
  waypoints: Waypoints,
  'grid-3x3': Grid3x3,
};

export const chapterIcon = (name: string): LucideIcon => ICONS[name] ?? BookOpen;
