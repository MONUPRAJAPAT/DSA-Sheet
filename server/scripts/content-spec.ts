/**
 * Curated sheet structure — the single source of truth the content resolver expands into
 * `src/seed/data/*.json`. Problems are referenced by platform id only; titles, difficulty and
 * every link are fetched & verified from the platforms themselves (see resolve-content.ts).
 *
 *   'lc:<slug>'        → https://leetcode.com/problems/<slug>/
 *   'cf:<contest><idx>' → https://codeforces.com/problemset/problem/<contest>/<idx>
 *
 * Within a topic, problems are ordered easy → hard so the auto study plan follows a sensible path.
 */
import type { Difficulty } from '@dsa/shared';

export interface ProblemSpec {
  ref: string;
  /** Theory article URL (required for Codeforces problems; LeetCode problems use the doocs wiki). */
  article?: string;
  /** Override the YouTube search query. */
  video?: string;
  /** The chosen video's title must contain one of these… */
  videoKeywords?: string[];
  /** …and none of these. */
  videoExclude?: string[];
}

export interface TopicSpec {
  title: string;
  slug: string;
  difficulty: Difficulty;
  description: string;
  /** LeetCode tag slug → topic-level practice list. */
  tag: string;
  /** YouTube search query for the concept video. */
  video: string;
  /** The chosen video's title must contain at least one of these (case-insensitive). */
  videoKeywords?: string[];
  /** …and none of these. */
  videoExclude?: string[];
  /** Theory article URL (GeeksforGeeks / cp-algorithms) — verified live by the resolver. */
  article: string;
  problems: (string | ProblemSpec)[];
}

export interface ChapterSpec {
  title: string;
  slug: string;
  icon: string;
  description: string;
  topics: TopicSpec[];
}

export const spec: ChapterSpec[] = [
  {
    title: 'Arrays',
    slug: 'arrays',
    icon: 'brackets',
    description:
      'The foundation of DSA — traversal, in-place tricks, prefix sums, Kadane and 2D matrices.',
    topics: [
      {
        title: 'Array Fundamentals',
        slug: 'array-fundamentals',
        difficulty: 'Easy',
        description: 'Traversal, in-place updates and the classic interview warm-ups.',
        tag: 'array',
        video: 'arrays data structure introduction one shot',
        videoKeywords: ['array'],
        videoExclude: ['stack', 'queue', 'linked', 'binary search'],
        article:
          'https://www.geeksforgeeks.org/dsa/introduction-to-arrays-data-structure-and-algorithm-tutorials/',
        problems: [
          'lc:remove-duplicates-from-sorted-array',
          'lc:move-zeroes',
          'lc:missing-number',
          'lc:max-consecutive-ones',
          'lc:majority-element',
          'lc:rotate-array',
          'lc:sort-colors',
          'lc:next-permutation',
        ],
      },
      {
        title: 'Prefix Sum',
        slug: 'prefix-sum',
        difficulty: 'Medium',
        description: 'Pre-compute running totals to answer range queries in O(1).',
        tag: 'prefix-sum',
        video: 'prefix sum technique explained',
        article:
          'https://www.geeksforgeeks.org/dsa/prefix-sum-array-implementation-applications-competitive-programming/',
        problems: [
          'lc:running-sum-of-1d-array',
          'lc:find-pivot-index',
          'lc:product-of-array-except-self',
          'lc:subarray-sum-equals-k',
          {
            ref: 'cf:466C',
            article:
              'https://www.geeksforgeeks.org/dsa/prefix-sum-array-implementation-applications-competitive-programming/',
            video: 'codeforces 466C number of ways',
            videoKeywords: ['466', 'number of ways'],
            videoExclude: ['sticks', 'leetcode'],
          },
        ],
      },
      {
        title: "Kadane's Algorithm",
        slug: 'kadanes-algorithm',
        difficulty: 'Medium',
        description: 'Maximum subarray problems solved in a single pass.',
        tag: 'dynamic-programming',
        video: 'kadane algorithm maximum subarray sum take u forward',
        article: 'https://www.geeksforgeeks.org/dsa/largest-sum-contiguous-subarray/',
        problems: [
          'lc:best-time-to-buy-and-sell-stock',
          'lc:maximum-subarray',
          'lc:maximum-product-subarray',
          'lc:maximum-sum-circular-subarray',
        ],
      },
      {
        title: 'Matrix Problems',
        slug: 'matrix-problems',
        difficulty: 'Medium',
        description: '2D traversal patterns: layers, spirals and in-place transforms.',
        tag: 'matrix',
        video: 'rotate matrix spiral matrix set matrix zeroes take u forward',
        videoKeywords: ['matrix'],
        videoExclude: ['binary search', 'search in'],
        article: 'https://www.geeksforgeeks.org/dsa/matrix/',
        problems: [
          'lc:pascals-triangle',
          'lc:set-matrix-zeroes',
          'lc:rotate-image',
          'lc:spiral-matrix',
        ],
      },
    ],
  },
  {
    title: 'Strings',
    slug: 'strings',
    icon: 'type',
    description: 'Character manipulation, palindromes and efficient pattern matching.',
    topics: [
      {
        title: 'String Fundamentals',
        slug: 'string-fundamentals',
        difficulty: 'Easy',
        description: 'Parsing, reversing and comparing strings.',
        tag: 'string',
        video: 'strings in data structures introduction',
        videoKeywords: ['string'],
        videoExclude: ['c++ basics'],
        article:
          'https://www.geeksforgeeks.org/dsa/introduction-to-strings-data-structure-and-algorithm-tutorials/',
        problems: [
          'lc:longest-common-prefix',
          'lc:roman-to-integer',
          'lc:isomorphic-strings',
          'lc:reverse-words-in-a-string',
          'lc:string-to-integer-atoi',
        ],
      },
      {
        title: 'Palindromes',
        slug: 'palindromes',
        difficulty: 'Medium',
        description: 'Expand-around-centre and two-pointer palindrome checks.',
        tag: 'string',
        video: 'longest palindromic substring expand around center',
        article: 'https://www.geeksforgeeks.org/dsa/longest-palindromic-substring/',
        problems: [
          'lc:valid-palindrome-ii',
          'lc:palindromic-substrings',
          'lc:longest-palindromic-substring',
        ],
      },
      {
        title: 'Pattern Matching',
        slug: 'pattern-matching',
        difficulty: 'Hard',
        description: 'KMP, LPS arrays and Z-function for linear-time matching.',
        tag: 'string-matching',
        video: 'KMP algorithm pattern matching explained',
        article: 'https://www.geeksforgeeks.org/dsa/kmp-algorithm-for-pattern-searching/',
        problems: [
          'lc:find-the-index-of-the-first-occurrence-in-a-string',
          'lc:repeated-substring-pattern',
          'lc:longest-happy-prefix',
          'lc:shortest-palindrome',
        ],
      },
    ],
  },
  {
    title: 'Hashing',
    slug: 'hashing',
    icon: 'hash',
    description: 'Hash maps and sets for O(1) lookups, counting and grouping.',
    topics: [
      {
        title: 'Hash Map & Set Basics',
        slug: 'hashmap-basics',
        difficulty: 'Easy',
        description: 'Trade memory for speed with constant-time lookups.',
        tag: 'hash-table',
        video: 'hashing in data structures take u forward',
        article: 'https://www.geeksforgeeks.org/dsa/introduction-to-hashing-2/',
        problems: [
          'lc:two-sum',
          'lc:contains-duplicate',
          'lc:valid-anagram',
          'lc:intersection-of-two-arrays',
          'lc:ransom-note',
          {
            ref: 'cf:4C',
            article: 'https://www.geeksforgeeks.org/dsa/introduction-to-hashing-2/',
            video: 'codeforces 4C registration system',
          },
        ],
      },
      {
        title: 'Frequency Counting',
        slug: 'frequency-counting',
        difficulty: 'Medium',
        description: 'Count, bucket and group elements by key.',
        tag: 'counting',
        video: 'top k frequent elements bucket sort',
        article: 'https://www.geeksforgeeks.org/dsa/counting-frequencies-of-array-elements/',
        problems: [
          'lc:sort-characters-by-frequency',
          'lc:group-anagrams',
          'lc:top-k-frequent-elements',
          {
            ref: 'lc:4sum-ii',
            video: '4Sum II leetcode 454',
            videoKeywords: ['4sum ii', '4 sum ii', '454'],
          },
          'lc:longest-consecutive-sequence',
        ],
      },
    ],
  },
  {
    title: 'Two Pointers & Sliding Window',
    slug: 'two-pointers-sliding-window',
    icon: 'move-horizontal',
    description: 'Shrink O(n²) scans into linear passes with pointers and windows.',
    topics: [
      {
        title: 'Two Pointers',
        slug: 'two-pointers',
        difficulty: 'Medium',
        description: 'Converging and same-direction pointers on sorted data.',
        tag: 'two-pointers',
        video: 'two pointers technique explained',
        article: 'https://www.geeksforgeeks.org/dsa/two-pointers-technique/',
        problems: [
          'lc:valid-palindrome',
          'lc:two-sum-ii-input-array-is-sorted',
          'lc:3sum',
          'lc:container-with-most-water',
          'lc:4sum',
          'lc:trapping-rain-water',
        ],
      },
      {
        title: 'Fixed-Size Window',
        slug: 'fixed-window',
        difficulty: 'Easy',
        description: 'Slide a window of size k and update the answer incrementally.',
        tag: 'sliding-window',
        video: 'sliding window technique fixed size',
        article: 'https://www.geeksforgeeks.org/dsa/window-sliding-technique/',
        problems: [
          'lc:maximum-average-subarray-i',
          'lc:maximum-points-you-can-obtain-from-cards',
          'lc:permutation-in-string',
          'lc:find-all-anagrams-in-a-string',
        ],
      },
      {
        title: 'Variable-Size Window',
        slug: 'variable-window',
        difficulty: 'Hard',
        description: 'Grow and shrink a window while maintaining an invariant.',
        tag: 'sliding-window',
        video: 'sliding window variable size take u forward',
        article: 'https://www.geeksforgeeks.org/dsa/window-sliding-technique/',
        problems: [
          'lc:longest-substring-without-repeating-characters',
          'lc:max-consecutive-ones-iii',
          'lc:fruit-into-baskets',
          'lc:longest-repeating-character-replacement',
          {
            ref: 'cf:279B',
            article: 'https://www.geeksforgeeks.org/dsa/window-sliding-technique/',
            video: 'codeforces 279B books',
          },
          'lc:minimum-window-substring',
          'lc:sliding-window-maximum',
          'lc:subarrays-with-k-different-integers',
        ],
      },
    ],
  },
  {
    title: 'Binary Search',
    slug: 'binary-search',
    icon: 'search',
    description: 'Halve the search space — on arrays and on the answer itself.',
    topics: [
      {
        title: 'Binary Search Basics',
        slug: 'binary-search-basics',
        difficulty: 'Easy',
        description: 'Iterative binary search, bounds and off-by-one safety.',
        tag: 'binary-search',
        video: 'binary search introduction take u forward',
        article: 'https://www.geeksforgeeks.org/dsa/binary-search/',
        problems: [
          'lc:binary-search',
          'lc:search-insert-position',
          'lc:first-bad-version',
          'lc:sqrtx',
          'lc:find-first-and-last-position-of-element-in-sorted-array',
        ],
      },
      {
        title: 'Binary Search on Arrays',
        slug: 'binary-search-arrays',
        difficulty: 'Medium',
        description: 'Rotated arrays, peaks and 2D matrices.',
        tag: 'binary-search',
        video: 'search in rotated sorted array binary search',
        article:
          'https://www.geeksforgeeks.org/dsa/search-an-element-in-a-sorted-and-pivoted-array/',
        problems: [
          'lc:search-in-rotated-sorted-array',
          'lc:find-minimum-in-rotated-sorted-array',
          'lc:find-peak-element',
          'lc:single-element-in-a-sorted-array',
          'lc:search-a-2d-matrix',
        ],
      },
      {
        title: 'Binary Search on Answer',
        slug: 'binary-search-on-answer',
        difficulty: 'Hard',
        description: 'Search over the answer space with a monotonic feasibility check.',
        tag: 'binary-search',
        video: 'koko eating bananas binary search on answers take u forward',
        videoKeywords: ['koko', 'on answer'],
        article: 'https://cp-algorithms.com/num_methods/binary_search.html',
        problems: [
          'lc:koko-eating-bananas',
          'lc:capacity-to-ship-packages-within-d-days',
          {
            ref: 'cf:1201C',
            article: 'https://cp-algorithms.com/num_methods/binary_search.html',
            video: 'codeforces 1201C maximum median',
          },
          'lc:split-array-largest-sum',
          'lc:median-of-two-sorted-arrays',
        ],
      },
    ],
  },
  {
    title: 'Recursion & Backtracking',
    slug: 'recursion-backtracking',
    icon: 'git-branch',
    description: 'Think recursively, then explore choices and undo them.',
    topics: [
      {
        title: 'Recursion Basics',
        slug: 'recursion-basics',
        difficulty: 'Easy',
        description: 'Base cases, recursive calls and divide & conquer.',
        tag: 'recursion',
        video: 'recursion introduction take u forward',
        article: 'https://www.geeksforgeeks.org/dsa/introduction-to-recursion-2/',
        problems: [
          'lc:fibonacci-number',
          'lc:powx-n',
          'lc:k-th-symbol-in-grammar',
          'lc:sort-an-array',
        ],
      },
      {
        title: 'Subsets & Combinations',
        slug: 'subsets-combinations',
        difficulty: 'Medium',
        description: 'Pick / not-pick patterns to generate every possibility.',
        tag: 'backtracking',
        video: 'backtracking subsets permutations combinations',
        article: 'https://www.geeksforgeeks.org/dsa/introduction-to-backtracking-2/',
        problems: [
          'lc:subsets',
          'lc:subsets-ii',
          'lc:combination-sum',
          'lc:combination-sum-ii',
          'lc:permutations',
          'lc:letter-combinations-of-a-phone-number',
        ],
      },
      {
        title: 'Constraint Backtracking',
        slug: 'constraint-backtracking',
        difficulty: 'Hard',
        description: 'Prune the search tree on boards and partitions.',
        tag: 'backtracking',
        video: 'n queens backtracking explained',
        article: 'https://www.geeksforgeeks.org/dsa/n-queen-problem-backtracking-3/',
        problems: [
          'lc:word-search',
          'lc:palindrome-partitioning',
          'lc:n-queens',
          'lc:sudoku-solver',
        ],
      },
    ],
  },
  {
    title: 'Linked List',
    slug: 'linked-list',
    icon: 'link',
    description: 'Pointer manipulation, fast & slow pointers and in-place rewiring.',
    topics: [
      {
        title: 'Linked List Fundamentals',
        slug: 'linked-list-fundamentals',
        difficulty: 'Easy',
        description: 'Traversal, insertion, deletion and reversal.',
        tag: 'linked-list',
        video: 'linked list introduction take u forward',
        article: 'https://www.geeksforgeeks.org/dsa/linked-list-data-structure/',
        problems: [
          'lc:reverse-linked-list',
          'lc:merge-two-sorted-lists',
          'lc:remove-linked-list-elements',
          'lc:intersection-of-two-linked-lists',
        ],
      },
      {
        title: 'Fast & Slow Pointers',
        slug: 'fast-slow-pointers',
        difficulty: 'Medium',
        description: "Floyd's tortoise and hare for middles, cycles and offsets.",
        tag: 'linked-list',
        video: 'floyd cycle detection linked list',
        article: 'https://www.geeksforgeeks.org/dsa/floyds-cycle-finding-algorithm/',
        problems: [
          'lc:middle-of-the-linked-list',
          {
            ref: 'lc:linked-list-cycle',
            video: 'linked list cycle leetcode 141',
            videoExclude: [' ii', '142'],
          },
          'lc:palindrome-linked-list',
          'lc:remove-nth-node-from-end-of-list',
          'lc:linked-list-cycle-ii',
          'lc:reorder-list',
        ],
      },
      {
        title: 'Advanced Linked List',
        slug: 'advanced-linked-list',
        difficulty: 'Hard',
        description: 'Deep copies, caches and k-group reversals.',
        tag: 'linked-list',
        video: 'lru cache design linked list hashmap',
        article: 'https://www.geeksforgeeks.org/dsa/lru-cache-implementation/',
        problems: [
          'lc:add-two-numbers',
          'lc:copy-list-with-random-pointer',
          'lc:lru-cache',
          'lc:merge-k-sorted-lists',
          'lc:reverse-nodes-in-k-group',
        ],
      },
    ],
  },
  {
    title: 'Stack & Queue',
    slug: 'stack-queue',
    icon: 'layers',
    description: 'LIFO / FIFO structures and the powerful monotonic stack.',
    topics: [
      {
        title: 'Stack & Queue Fundamentals',
        slug: 'stack-queue-fundamentals',
        difficulty: 'Easy',
        description: 'Implement and apply stacks and queues.',
        tag: 'stack',
        video: 'stack and queue introduction take u forward',
        article: 'https://www.geeksforgeeks.org/dsa/stack-data-structure/',
        problems: [
          'lc:valid-parentheses',
          'lc:implement-queue-using-stacks',
          'lc:implement-stack-using-queues',
          'lc:min-stack',
          'lc:evaluate-reverse-polish-notation',
        ],
      },
      {
        title: 'Monotonic Stack',
        slug: 'monotonic-stack',
        difficulty: 'Medium',
        description: 'Next greater / smaller element patterns in O(n).',
        tag: 'monotonic-stack',
        video: 'monotonic stack next greater element',
        article: 'https://www.geeksforgeeks.org/dsa/introduction-to-monotonic-stack-2/',
        problems: [
          'lc:next-greater-element-i',
          'lc:next-greater-element-ii',
          'lc:daily-temperatures',
          'lc:online-stock-span',
          'lc:asteroid-collision',
          'lc:remove-k-digits',
        ],
      },
      {
        title: 'Advanced Stack Problems',
        slug: 'advanced-stack',
        difficulty: 'Hard',
        description: 'Histograms, contribution technique and expression parsing.',
        tag: 'monotonic-stack',
        video: 'largest rectangle in histogram stack',
        article:
          'https://www.geeksforgeeks.org/dsa/largest-rectangular-area-in-a-histogram-using-stack/',
        problems: [
          'lc:sum-of-subarray-minimums',
          'lc:largest-rectangle-in-histogram',
          'lc:maximal-rectangle',
          'lc:basic-calculator',
        ],
      },
    ],
  },
  {
    title: 'Heaps & Greedy',
    slug: 'heaps-greedy',
    icon: 'triangle',
    description: 'Priority queues for top-k problems and greedy choices that stay optimal.',
    topics: [
      {
        title: 'Heap Fundamentals',
        slug: 'heap-fundamentals',
        difficulty: 'Easy',
        description: 'Min-heaps, max-heaps and the k-th element pattern.',
        tag: 'heap-priority-queue',
        video: 'heap priority queue introduction',
        article: 'https://www.geeksforgeeks.org/dsa/heap-data-structure/',
        problems: [
          'lc:last-stone-weight',
          'lc:kth-largest-element-in-a-stream',
          'lc:kth-largest-element-in-an-array',
          'lc:k-closest-points-to-origin',
        ],
      },
      {
        title: 'Heap Patterns',
        slug: 'heap-patterns',
        difficulty: 'Hard',
        description: 'Scheduling, two-heap medians and greedy with heaps.',
        tag: 'heap-priority-queue',
        video: 'find median from data stream two heaps',
        article:
          'https://www.geeksforgeeks.org/dsa/median-of-stream-of-running-integers-using-stl/',
        problems: [
          'lc:task-scheduler',
          'lc:reorganize-string',
          'lc:hand-of-straights',
          'lc:find-median-from-data-stream',
          'lc:ipo',
        ],
      },
      {
        title: 'Greedy Algorithms',
        slug: 'greedy',
        difficulty: 'Medium',
        description: 'Locally optimal choices — intervals, jumps and scheduling.',
        tag: 'greedy',
        video: 'greedy algorithms introduction',
        article:
          'https://www.geeksforgeeks.org/dsa/introduction-to-greedy-algorithm-data-structures-and-algorithm-tutorials/',
        problems: [
          'lc:assign-cookies',
          'lc:jump-game',
          'lc:jump-game-ii',
          'lc:gas-station',
          'lc:merge-intervals',
          'lc:insert-interval',
          'lc:non-overlapping-intervals',
          {
            ref: 'cf:545C',
            article:
              'https://www.geeksforgeeks.org/dsa/introduction-to-greedy-algorithm-data-structures-and-algorithm-tutorials/',
            video: 'codeforces 545C woodcutters',
          },
        ],
      },
    ],
  },
  {
    title: 'Trees & BST',
    slug: 'trees-bst',
    icon: 'network',
    description: 'Traversals, recursion on trees and binary search tree properties.',
    topics: [
      {
        title: 'Tree Traversals',
        slug: 'tree-traversals',
        difficulty: 'Easy',
        description: 'Pre/in/post-order DFS and level-order BFS.',
        tag: 'binary-tree',
        video: 'binary tree traversals take u forward',
        article:
          'https://www.geeksforgeeks.org/dsa/tree-traversals-inorder-preorder-and-postorder/',
        problems: [
          'lc:binary-tree-inorder-traversal',
          'lc:binary-tree-preorder-traversal',
          'lc:binary-tree-postorder-traversal',
          'lc:maximum-depth-of-binary-tree',
          'lc:binary-tree-level-order-traversal',
        ],
      },
      {
        title: 'Binary Tree Problems',
        slug: 'binary-tree-problems',
        difficulty: 'Medium',
        description: 'Height, diameter, views, ancestors and construction.',
        tag: 'binary-tree',
        video: 'diameter of binary tree',
        article: 'https://www.geeksforgeeks.org/dsa/binary-tree-data-structure/',
        problems: [
          'lc:invert-binary-tree',
          'lc:same-tree',
          'lc:diameter-of-binary-tree',
          'lc:balanced-binary-tree',
          'lc:binary-tree-right-side-view',
          'lc:binary-tree-zigzag-level-order-traversal',
          'lc:lowest-common-ancestor-of-a-binary-tree',
          'lc:construct-binary-tree-from-preorder-and-inorder-traversal',
        ],
      },
      {
        title: 'Binary Search Trees',
        slug: 'binary-search-trees',
        difficulty: 'Medium',
        description: 'Use the BST ordering for search, insert and validation.',
        tag: 'binary-search-tree',
        video: 'binary search tree introduction',
        article: 'https://www.geeksforgeeks.org/dsa/binary-search-tree-data-structure/',
        problems: [
          'lc:search-in-a-binary-search-tree',
          'lc:insert-into-a-binary-search-tree',
          'lc:validate-binary-search-tree',
          'lc:kth-smallest-element-in-a-bst',
          {
            ref: 'lc:lowest-common-ancestor-of-a-binary-search-tree',
            video: 'lowest common ancestor of a binary search tree leetcode 235',
            videoKeywords: ['search tree', 'bst', '235'],
          },
        ],
      },
      {
        title: 'Advanced Trees',
        slug: 'advanced-trees',
        difficulty: 'Hard',
        description: 'Path sums, serialization and vertical ordering.',
        tag: 'tree',
        video: 'binary tree maximum path sum',
        article: 'https://www.geeksforgeeks.org/dsa/find-maximum-path-sum-in-a-binary-tree/',
        problems: [
          'lc:vertical-order-traversal-of-a-binary-tree',
          'lc:binary-tree-maximum-path-sum',
          'lc:serialize-and-deserialize-binary-tree',
        ],
      },
    ],
  },
  {
    title: 'Graphs',
    slug: 'graphs',
    icon: 'waypoints',
    description: 'BFS/DFS, topological sort, shortest paths, MST and DSU.',
    topics: [
      {
        title: 'BFS & DFS',
        slug: 'bfs-dfs',
        difficulty: 'Medium',
        description: 'Traverse grids and graphs; connected components.',
        tag: 'breadth-first-search',
        video: 'graph bfs dfs traversal take u forward',
        article: 'https://www.geeksforgeeks.org/dsa/breadth-first-search-or-bfs-for-a-graph/',
        problems: [
          'lc:flood-fill',
          'lc:number-of-islands',
          'lc:max-area-of-island',
          'lc:rotting-oranges',
          'lc:01-matrix',
          'lc:surrounded-regions',
          'lc:clone-graph',
        ],
      },
      {
        title: 'Topological Sort & Cycles',
        slug: 'topological-sort',
        difficulty: 'Medium',
        description: "Kahn's algorithm, DFS ordering and bipartite checks.",
        tag: 'topological-sort',
        video: 'topological sort kahn algorithm',
        article: 'https://cp-algorithms.com/graph/topological-sort.html',
        problems: [
          'lc:is-graph-bipartite',
          'lc:course-schedule',
          'lc:course-schedule-ii',
          'lc:find-eventual-safe-states',
        ],
      },
      {
        title: 'Shortest Paths & MST',
        slug: 'shortest-paths-mst',
        difficulty: 'Hard',
        description: "Dijkstra, Bellman-Ford and Prim's / Kruskal's.",
        tag: 'shortest-path',
        video: 'dijkstra algorithm shortest path',
        article: 'https://cp-algorithms.com/graph/dijkstra.html',
        problems: [
          'lc:network-delay-time',
          'lc:path-with-minimum-effort',
          'lc:cheapest-flights-within-k-stops',
          'lc:min-cost-to-connect-all-points',
          {
            ref: 'cf:20C',
            article: 'https://cp-algorithms.com/graph/dijkstra.html',
            video: 'codeforces 20C dijkstra',
          },
          'lc:swim-in-rising-water',
        ],
      },
      {
        title: 'Disjoint Set Union',
        slug: 'disjoint-set-union',
        difficulty: 'Hard',
        description: 'Union by rank and path compression for dynamic connectivity.',
        tag: 'union-find',
        video: 'disjoint set union by rank path compression',
        article: 'https://cp-algorithms.com/data_structures/disjoint_set_union.html',
        problems: [
          'lc:number-of-provinces',
          'lc:redundant-connection',
          'lc:accounts-merge',
          'lc:making-a-large-island',
        ],
      },
    ],
  },
  {
    title: 'Dynamic Programming',
    slug: 'dynamic-programming',
    icon: 'grid-3x3',
    description: 'Overlapping subproblems — memoization, tabulation and space optimization.',
    topics: [
      {
        title: '1D Dynamic Programming',
        slug: 'dp-1d',
        difficulty: 'Easy',
        description: 'Linear recurrences — stairs, robbers and decodings.',
        tag: 'dynamic-programming',
        video: 'dynamic programming introduction take u forward',
        article:
          'https://www.geeksforgeeks.org/dsa/introduction-to-dynamic-programming-data-structures-and-algorithm-tutorials/',
        problems: [
          'lc:climbing-stairs',
          'lc:min-cost-climbing-stairs',
          'lc:house-robber',
          'lc:house-robber-ii',
          {
            ref: 'cf:189A',
            article:
              'https://www.geeksforgeeks.org/dsa/maximize-the-number-of-segments-of-length-p-q-and-r/',
            video: 'codeforces 189A cut ribbon',
          },
          'lc:decode-ways',
        ],
      },
      {
        title: 'Grid DP',
        slug: 'dp-grid',
        difficulty: 'Medium',
        description: 'Paths and costs on 2D grids.',
        tag: 'dynamic-programming',
        video: 'dp on grids unique paths',
        article: 'https://www.geeksforgeeks.org/dsa/unique-paths-in-a-grid-with-obstacles/',
        problems: ['lc:unique-paths', 'lc:unique-paths-ii', 'lc:minimum-path-sum', 'lc:triangle'],
      },
      {
        title: 'Knapsack & Subsequences',
        slug: 'dp-knapsack',
        difficulty: 'Medium',
        description: '0/1 and unbounded knapsack, subset sums and LIS.',
        tag: 'dynamic-programming',
        video: '0 1 knapsack dynamic programming',
        article: 'https://www.geeksforgeeks.org/dsa/0-1-knapsack-problem-dp-10/',
        problems: [
          'lc:coin-change',
          'lc:coin-change-ii',
          'lc:partition-equal-subset-sum',
          'lc:target-sum',
          'lc:longest-increasing-subsequence',
        ],
      },
      {
        title: 'DP on Strings & Intervals',
        slug: 'dp-strings',
        difficulty: 'Hard',
        description: 'LCS, edit distance and interval DP.',
        tag: 'dynamic-programming',
        video: 'longest common subsequence dynamic programming',
        article: 'https://www.geeksforgeeks.org/dsa/longest-common-subsequence-dp-4/',
        problems: [
          'lc:longest-common-subsequence',
          'lc:word-break',
          'lc:edit-distance',
          'lc:distinct-subsequences',
          'lc:burst-balloons',
        ],
      },
    ],
  },
];
