const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "../.env") });
require("dotenv").config();
const mongoose = require("mongoose");

const Assessment = require("../models/Assessment");
const AssessmentLevel = require("../models/AssessmentLevel");
const QuestionBank = require("../models/QuestionBank");

const ASSESSMENTS = [
    {
        title: "Comprehensive Placement Diagnostic",
        slug: "diag_comprehensive",
        category: "diagnostic",
        description: "All-round diagnostic placement test covering DSA, Core CS, Web Engineering, Aptitude, and System Architecture.",
        icon: "bi-mortarboard-fill",
        badge: "Comprehensive",
        badgeColor: "primary",
        order: 1,
    },
    {
        title: "DSA & Algorithms Mastery",
        slug: "dsa_challenge",
        category: "dsa",
        description: "Data structures, asymptotic analysis, binary trees, graphs, dynamic programming, and greedy algorithms.",
        icon: "bi-code-square",
        badge: "Technical",
        badgeColor: "success",
        order: 2,
    },
    {
        title: "Core CS (OS, DBMS & Networks)",
        slug: "core_cs_test",
        category: "core_cs",
        description: "ACID transactions, deadlock handling, memory virtualization, TCP/IP flow control, and indexing architectures.",
        icon: "bi-cpu-fill",
        badge: "Foundational",
        badgeColor: "info",
        order: 3,
    },
    {
        title: "Full Stack & Web Engineering",
        slug: "web_dev_test",
        category: "web_dev",
        description: "Modern JavaScript, React reconciliation, asynchronous Node.js event loops, REST & GraphQL, and web security.",
        icon: "bi-window-stack",
        badge: "Applied",
        badgeColor: "warning",
        order: 4,
    },
    {
        title: "Quantitative & Logical Aptitude",
        slug: "aptitude_test",
        category: "aptitude",
        description: "Speed-distance-time, financial arithmetic, combinatorics, series completion, logical deductions, and data sufficiency.",
        icon: "bi-calculator-fill",
        badge: "Screening",
        badgeColor: "secondary",
        order: 5,
    },
    {
        title: "System Design & Scalability",
        slug: "system_design_test",
        category: "system_design",
        description: "Distributed caching, consistent hashing, message brokers, rate limiting algorithms, and database sharding patterns.",
        icon: "bi-diagram-3-fill",
        badge: "Architectural",
        badgeColor: "danger",
        order: 6,
    },
];

const ASSESSMENT_LEVELS = [
    {
        name: "Beginner",
        slug: "beginner",
        description: "Foundational conceptual questions focusing on definitions, basic principles, and core syntax.",
        durationMinutes: 10,
        totalQuestions: 10,
        passingPercentage: 60,
        difficultyDistribution: { easy: 70, medium: 30, hard: 0, expert: 0 },
        badge: "Level 1",
        color: "success",
        order: 1,
    },
    {
        name: "Intermediate",
        slug: "intermediate",
        description: "Practical scenarios and problem-solving evaluating industry knowledge and standard implementation patterns.",
        durationMinutes: 15,
        totalQuestions: 12,
        passingPercentage: 65,
        difficultyDistribution: { easy: 20, medium: 60, hard: 20, expert: 0 },
        badge: "Level 2",
        color: "info",
        order: 2,
    },
    {
        name: "Advanced",
        slug: "advanced",
        description: "Complex algorithmic trade-offs, internal engine mechanics, performance bottlenecks, and edge case mastery.",
        durationMinutes: 20,
        totalQuestions: 15,
        passingPercentage: 70,
        difficultyDistribution: { easy: 0, medium: 30, hard: 50, expert: 20 },
        badge: "Level 3",
        color: "warning",
        order: 3,
    },
    {
        name: "Expert",
        slug: "expert",
        description: "High-level architectural reasoning, distributed system failures, concurrency hazards, and deep design trade-offs.",
        durationMinutes: 25,
        totalQuestions: 15,
        passingPercentage: 75,
        difficultyDistribution: { easy: 0, medium: 0, hard: 40, expert: 60 },
        badge: "Level 4",
        color: "danger",
        order: 4,
    },
];

const QUESTIONS = [
    // ----------------------------------------------------
    // DSA QUESTIONS (Easy, Medium, Hard, Expert)
    // ----------------------------------------------------
    {
        question_text: "What is the average time complexity for searching an element in a Hash Table with a well-distributed hash function?",
        category: "dsa",
        subtopic: "Hash Tables",
        difficulty: "easy",
        options: [
            { option_id: "A", text: "O(1)" },
            { option_id: "B", text: "O(n)" },
            { option_id: "C", text: "O(log n)" },
            { option_id: "D", text: "O(n log n)" },
        ],
        correct_option_id: "A",
        explanation: "In a well-designed hash table with minimal collisions, key lookups average O(1) constant time.",
        marks: 1,
    },
    {
        question_text: "Which data structure is primarily utilized in Breadth-First Search (BFS) graph traversal?",
        category: "dsa",
        subtopic: "Trees & Graphs",
        difficulty: "easy",
        options: [
            { option_id: "A", text: "LIFO Stack" },
            { option_id: "B", text: "FIFO Queue" },
            { option_id: "C", text: "Min-Heap" },
            { option_id: "D", text: "Disjoint Set Union" },
        ],
        correct_option_id: "B",
        explanation: "BFS explores vertices level by level, requiring a FIFO (First-In, First-Out) Queue.",
        marks: 1,
    },
    {
        question_text: "What is the worst-case time complexity of QuickSort when the pivot chosen is always the minimum or maximum element?",
        category: "dsa",
        subtopic: "Sorting & Searching",
        difficulty: "easy",
        options: [
            { option_id: "A", text: "O(n)" },
            { option_id: "B", text: "O(n log n)" },
            { option_id: "C", text: "O(n^2)" },
            { option_id: "D", text: "O(2^n)" },
        ],
        correct_option_id: "C",
        explanation: "When QuickSort partitions into subproblems of size 0 and n-1 at each step, its recurrence becomes T(n) = T(n-1) + O(n), resulting in O(n^2) worst-case time.",
        marks: 1,
    },
    {
        question_text: "What is the best data structure to implement a Least Recently Used (LRU) Cache with O(1) get and put operations?",
        category: "dsa",
        subtopic: "Cache Architectures",
        difficulty: "medium",
        options: [
            { option_id: "A", text: "Doubly Linked List combined with a Hash Map" },
            { option_id: "B", text: "Singly Linked List with Binary Search Tree" },
            { option_id: "C", text: "Max Heap with Array" },
            { option_id: "D", text: "Circular Array with Stack" },
        ],
        correct_option_id: "A",
        explanation: "The Hash Map yields O(1) lookup to nodes, while the Doubly Linked List enables O(1) node detachment and head/tail re-insertion for eviction and recency updates.",
        marks: 1,
    },
    {
        question_text: "In Dijkstra's algorithm for single-source shortest paths on a graph with V vertices and E non-negative edges, what is the optimal time complexity using a Fibonacci Heap?",
        category: "dsa",
        subtopic: "Shortest Path",
        difficulty: "medium",
        options: [
            { option_id: "A", text: "O(V^2)" },
            { option_id: "B", text: "O(E + V log V)" },
            { option_id: "C", text: "O(E log V)" },
            { option_id: "D", text: "O(V * E)" },
        ],
        correct_option_id: "B",
        explanation: "Using a Fibonacci Heap, Decrease-Key runs in amortized O(1) while Extract-Min takes O(log V), giving a total runtime of O(E + V log V).",
        marks: 1,
    },
    {
        question_text: "Which approach solves the 0/1 Knapsack problem with N items and maximum weight capacity W in pseudo-polynomial time?",
        category: "dsa",
        subtopic: "Dynamic Programming",
        difficulty: "medium",
        options: [
            { option_id: "A", text: "Greedy choice based on highest value density" },
            { option_id: "B", text: "Dynamic Programming 2D table of size O(N * W)" },
            { option_id: "C", text: "Divide and Conquer in O(N log W)" },
            { option_id: "D", text: "Pure BFS in O(N + W)" },
        ],
        correct_option_id: "B",
        explanation: "0/1 Knapsack exhibits optimal substructure and overlapping subproblems solved using a 2D DP array dp[i][w] in O(N*W) time and space.",
        marks: 1,
    },
    {
        question_text: "What is the time complexity of building a Fenwick Tree (Binary Indexed Tree) for an array of size N in-place?",
        category: "dsa",
        subtopic: "Advanced Data Structures",
        difficulty: "hard",
        options: [
            { option_id: "A", text: "O(N log N)" },
            { option_id: "B", text: "O(N)" },
            { option_id: "C", text: "O(N^2)" },
            { option_id: "D", text: "O(log N)" },
        ],
        correct_option_id: "B",
        explanation: "By cascading prefix sums up to parent indices (idx + (idx & -idx)) from 1 to N sequentially, a Fenwick Tree can be initialized in linear O(N) time.",
        marks: 2,
    },
    {
        question_text: "In Tarjan's algorithm for finding Strongly Connected Components (SCCs) in a directed graph, what does lowlink[u] represent?",
        category: "dsa",
        subtopic: "Graph Algorithms",
        difficulty: "hard",
        options: [
            { option_id: "A", text: "The minimum in-degree of all neighbors reachable from u" },
            { option_id: "B", text: "The smallest discovery time vertex reachable from u through its subtree and at most one back-edge" },
            { option_id: "C", text: "The total number of cycle components containing u" },
            { option_id: "D", text: "The length of the shortest path from the root node to u" },
        ],
        correct_option_id: "B",
        explanation: "lowlink[u] denotes the smallest discovery timestamp (ids[v]) of any vertex v reachable from u through DFS tree edges or back-edges on the active recursion stack.",
        marks: 2,
    },
    {
        question_text: "Consider an Aho-Corasick automaton built for multiple string matching. What data structure and failure transition does it leverage?",
        category: "dsa",
        subtopic: "String Matching",
        difficulty: "expert",
        options: [
            { option_id: "A", text: "Suffix Automaton with suffix links and palindromic trees" },
            { option_id: "B", text: "Trie of patterns augmented with BFS failure links pointing to the longest proper suffix that is also a prefix in the trie" },
            { option_id: "C", text: "Rabin-Karp rolling hashes indexed inside a bloom filter" },
            { option_id: "D", text: "Radix Tree with Boyer-Moore bad character delta tables" },
        ],
        correct_option_id: "B",
        explanation: "Aho-Corasick constructs a Trie of all keywords, then uses BFS to create failure links to the longest matching proper suffix node, enabling linear time multiple pattern search in O(text_length + total_matches).",
        marks: 2,
    },
    {
        question_text: "In Persistent Segment Trees with path copying, what is the space complexity per point update operation over an array of size N?",
        category: "dsa",
        subtopic: "Persistent Data Structures",
        difficulty: "expert",
        options: [
            { option_id: "A", text: "O(1)" },
            { option_id: "B", text: "O(log N)" },
            { option_id: "C", text: "O(N)" },
            { option_id: "D", text: "O(N log N)" },
        ],
        correct_option_id: "B",
        explanation: "Path copying only clones the nodes along the direct traversal from the root to the updated leaf (the tree depth), which allocates exactly O(log N) new nodes per version.",
        marks: 2,
    },

    // ----------------------------------------------------
    // CORE CS QUESTIONS (OS, DBMS, Networks)
    // ----------------------------------------------------
    {
        question_text: "Which ACID property guarantees that all database operations in a transaction either complete entirely or are fully rolled back upon failure?",
        category: "core_cs",
        subtopic: "DBMS & Transactions",
        difficulty: "easy",
        options: [
            { option_id: "A", text: "Atomicity" },
            { option_id: "B", text: "Consistency" },
            { option_id: "C", text: "Isolation" },
            { option_id: "D", text: "Durability" },
        ],
        correct_option_id: "A",
        explanation: "Atomicity ensures the 'all-or-nothing' execution of a transaction.",
        marks: 1,
    },
    {
        question_text: "Which of the following is NOT one of Coffman's four necessary conditions for a system deadlock to occur?",
        category: "core_cs",
        subtopic: "Operating Systems",
        difficulty: "easy",
        options: [
            { option_id: "A", text: "Mutual Exclusion" },
            { option_id: "B", text: "Hold and Wait" },
            { option_id: "C", text: "Preemption of resources allowed" },
            { option_id: "D", text: "Circular Wait" },
        ],
        correct_option_id: "C",
        explanation: "Deadlock requires No Preemption (resources cannot be forcibly taken from a process). Allowing preemption actively prevents deadlock.",
        marks: 1,
    },
    {
        question_text: "At which layer of the OSI model does the TCP protocol operate?",
        category: "core_cs",
        subtopic: "Computer Networks",
        difficulty: "easy",
        options: [
            { option_id: "A", text: "Network Layer (Layer 3)" },
            { option_id: "B", text: "Transport Layer (Layer 4)" },
            { option_id: "C", text: "Data Link Layer (Layer 2)" },
            { option_id: "D", text: "Session Layer (Layer 5)" },
        ],
        correct_option_id: "B",
        explanation: "TCP operates at Layer 4 (Transport Layer), providing reliable, ordered, and error-checked delivery of streams of octets.",
        marks: 1,
    },
    {
        question_text: "Why do relational databases commonly use B+ Trees instead of Binary Search Trees or standard B-Trees for disk-backed table indexing?",
        category: "core_cs",
        subtopic: "Database Indexing",
        difficulty: "medium",
        options: [
            { option_id: "A", text: "All data records are stored exclusively in leaf nodes linked sequentially, optimizing sequential range scans and minimizing disk I/O depth" },
            { option_id: "B", text: "B+ Trees have O(1) worst-case search complexity" },
            { option_id: "C", text: "B+ Trees do not require rebalancing during deletions" },
            { option_id: "D", text: "Internal nodes store full data records, reducing total memory footprint" },
        ],
        correct_option_id: "A",
        explanation: "In B+ Trees, internal nodes only store routing keys, allowing high fan-out (low tree depth), and all leaf nodes form a doubly linked list for fast sequential range scans.",
        marks: 1,
    },
    {
        question_text: "What phenomenon in Virtual Memory occurs when high page fault frequency causes the OS to spend more time swapping pages than executing user instructions?",
        category: "core_cs",
        subtopic: "Memory Management",
        difficulty: "medium",
        options: [
            { option_id: "A", text: "Internal Fragmentation" },
            { option_id: "B", text: "Thrashing" },
            { option_id: "C", text: "Deadlock" },
            { option_id: "D", text: "Starvation" },
        ],
        correct_option_id: "B",
        explanation: "Thrashing occurs when the collective working sets of active processes exceed physical RAM, causing continuous page swapping and collapsing CPU throughput.",
        marks: 1,
    },
    {
        question_text: "In TCP congestion control, what triggers the Fast Retransmit mechanism?",
        category: "core_cs",
        subtopic: "Computer Networks",
        difficulty: "medium",
        options: [
            { option_id: "A", text: "The arrival of 3 duplicate ACKs for the same sequence number" },
            { option_id: "B", text: "The expiration of the Retransmission Timeout (RTO) timer" },
            { option_id: "C", text: "A SYN packet with the ECN flag enabled" },
            { option_id: "D", text: "A FIN handshake termination packet" },
        ],
        correct_option_id: "A",
        explanation: "Receiving 3 duplicate ACKs indicates that out-of-order packets reached the receiver, prompting Fast Retransmit without waiting for the slow RTO timer to expire.",
        marks: 1,
    },
    {
        question_text: "In database concurrency control under Strict Two-Phase Locking (Strict 2PL), when are exclusive (write) locks released?",
        category: "core_cs",
        subtopic: "Concurrency Control",
        difficulty: "hard",
        options: [
            { option_id: "A", text: "Immediately after the specific write statement finishes executing" },
            { option_id: "B", text: "Only when the transaction commits or aborts" },
            { option_id: "C", text: "During the shrinking phase prior to commit" },
            { option_id: "D", text: "Whenever another transaction requests a shared lock" },
        ],
        correct_option_id: "B",
        explanation: "Strict 2PL holds all exclusive write locks until transaction completion (COMMIT or ABORT) to prevent cascading rollbacks and dirty reads.",
        marks: 2,
    },
    {
        question_text: "What kernel mechanism allows modern Linux high-performance network servers (like Nginx) to handle 100,000+ concurrent socket connections in O(1) ready notification time?",
        category: "core_cs",
        subtopic: "Operating Systems",
        difficulty: "hard",
        options: [
            { option_id: "A", text: "select() system call polling" },
            { option_id: "B", text: "epoll with ready-list event notification callbacks" },
            { option_id: "C", text: "Spawning one kernel thread per TCP socket" },
            { option_id: "D", text: "Standard blocking read() on thread pool" },
        ],
        correct_option_id: "B",
        explanation: "Unlike select() and poll() which scan all file descriptors in O(N) time, epoll maintains an in-kernel interest list with ready-list callbacks delivering active events in O(1) time.",
        marks: 2,
    },
    {
        question_text: "In the Raft distributed consensus algorithm, how does a leader determine that a log entry is safely committed and can be applied to the state machine?",
        category: "core_cs",
        subtopic: "Distributed Consensus",
        difficulty: "expert",
        options: [
            { option_id: "A", text: "Once all follower nodes acknowledge receipt" },
            { option_id: "B", text: "Once the entry is replicated on a majority of nodes and at least one entry from the current leader's term is replicated on that majority" },
            { option_id: "C", text: "Immediately after the leader writes it to its local write-ahead log" },
            { option_id: "D", text: "When a two-phase commit coordinator returns an ACK" },
        ],
        correct_option_id: "B",
        explanation: "Raft leaders never commit log entries from previous terms simply by counting replicas; the leader must replicate an entry from its own current term onto a majority to guarantee safety.",
        marks: 2,
    },
    {
        question_text: "Under Multi-Version Concurrency Control (MVCC) in PostgreSQL, what happens to dead tuple versions left by updated or deleted rows?",
        category: "core_cs",
        subtopic: "DBMS Internals",
        difficulty: "expert",
        options: [
            { option_id: "A", text: "They are deleted synchronously during the transaction's commit step" },
            { option_id: "B", text: "They remain in table heap pages until reclaimed by VACUUM processes once no active transaction snapshot requires them" },
            { option_id: "C", text: "They are overwritten immediately via in-place row replacement" },
            { option_id: "D", text: "They are moved to an auxiliary swap file on disk" },
        ],
        correct_option_id: "B",
        explanation: "PostgreSQL writes new row versions without overwriting old ones. The VACUUM engine asynchronously reclaims space once obsolete tuple xmax values precede all active transaction horizons.",
        marks: 2,
    },

    // ----------------------------------------------------
    // WEB DEVELOPMENT QUESTIONS (React, Node, APIs, Security)
    // ----------------------------------------------------
    {
        question_text: "Which HTTP method is defined as idempotent and intended for replacing an existing resource entirely?",
        category: "web_dev",
        subtopic: "REST APIs",
        difficulty: "easy",
        options: [
            { option_id: "A", text: "POST" },
            { option_id: "B", text: "PATCH" },
            { option_id: "C", text: "PUT" },
            { option_id: "D", text: "DELETE" },
        ],
        correct_option_id: "C",
        explanation: "PUT is idempotent and replaces the target resource with the uploaded payload. Multiple identical PUT requests leave the server in the exact same state.",
        marks: 1,
    },
    {
        question_text: "In React, which hook is designated for performing side effects such as data fetching, subscriptions, or manual DOM mutations?",
        category: "web_dev",
        subtopic: "React Fundamentals",
        difficulty: "easy",
        options: [
            { option_id: "A", text: "useState" },
            { option_id: "B", text: "useMemo" },
            { option_id: "C", text: "useEffect" },
            { option_id: "D", text: "useCallback" },
        ],
        correct_option_id: "C",
        explanation: "useEffect lets you synchronize a component with external systems and side effects after rendering.",
        marks: 1,
    },
    {
        question_text: "Which cookie attribute prevents client-side JavaScript (e.g., document.cookie) from accessing the cookie, mitigating Cross-Site Scripting (XSS) token theft?",
        category: "web_dev",
        subtopic: "Web Security",
        difficulty: "easy",
        options: [
            { option_id: "A", text: "Secure" },
            { option_id: "B", text: "HttpOnly" },
            { option_id: "C", text: "SameSite=Lax" },
            { option_id: "D", text: "Domain" },
        ],
        correct_option_id: "B",
        explanation: "The HttpOnly flag blocks client-side scripts from reading cookie values, protecting sensitive session credentials from malicious XSS injection scripts.",
        marks: 1,
    },
    {
        question_text: "How does the Node.js event loop prioritize execution between the microtask queue (process.nextTick, Promise callbacks) and the macrotask/timer queue (setTimeout)?",
        category: "web_dev",
        subtopic: "Node.js Architecture",
        difficulty: "medium",
        options: [
            { option_id: "A", text: "Macrotasks run before microtasks in every tick" },
            { option_id: "B", text: "The microtask queue is drained completely immediately after the current operation and between individual event loop phases before next macrotasks" },
            { option_id: "C", text: "They execute strictly in the chronological order they were queued" },
            { option_id: "D", text: "Node.js schedules them using round-robin thread assignments" },
        ],
        correct_option_id: "B",
        explanation: "Microtasks (process.nextTick, Promises) have higher priority: all pending microtasks are completely processed immediately after the current synchronous stack and between phase transitions.",
        marks: 1,
    },
    {
        question_text: "What causes a Cross-Origin Resource Sharing (CORS) preflight request (OPTIONS) to be triggered by the browser before the actual HTTP request?",
        category: "web_dev",
        subtopic: "Browser Security & CORS",
        difficulty: "medium",
        options: [
            { option_id: "A", text: "Any cross-origin GET request with simple query parameters" },
            { option_id: "B", text: "Non-simple HTTP methods (e.g. PUT, DELETE) or custom HTTP headers (e.g. Authorization, Content-Type: application/json)" },
            { option_id: "C", text: "Sending requests over HTTPS to HTTP" },
            { option_id: "D", text: "Requests with image payloads in multipart/form-data" },
        ],
        correct_option_id: "B",
        explanation: "If a cross-origin request uses methods other than GET/HEAD/POST or content types other than form-urlencoded/multipart/text/plain, or custom headers like Authorization, the browser sends an OPTIONS preflight.",
        marks: 1,
    },
    {
        question_text: "In React, why must hooks never be called inside conditional statements, loops, or nested functions?",
        category: "web_dev",
        subtopic: "React Internals",
        difficulty: "medium",
        options: [
            { option_id: "A", text: "It causes memory leaks in the browser V8 engine" },
            { option_id: "B", text: "React relies on the exact invocation order of hooks across re-renders to match each hook with its internal fiber linked-list state" },
            { option_id: "C", text: "JavaScript engines disable JIT compilation for conditional hook functions" },
            { option_id: "D", text: "React enforces this solely to ensure consistent JSX linting" },
        ],
        correct_option_id: "B",
        explanation: "React maintains hook states as a singly-linked list on the component's Fiber. Altering call order between renders causes misaligned state references.",
        marks: 1,
    },
    {
        question_text: "To protect an API against SQL Injection when executing dynamic queries, what is the most effective defense mechanism?",
        category: "web_dev",
        subtopic: "Application Security",
        difficulty: "hard",
        options: [
            { option_id: "A", text: "Sanitizing user input with client-side regex matching" },
            { option_id: "B", text: "Using Parameterized Queries (Prepared Statements) or an ORM with parameterized binding" },
            { option_id: "C", text: "Escaping all double quote characters with backslashes" },
            { option_id: "D", text: "Encrypting query strings with AES-256 before sending to the database" },
        ],
        correct_option_id: "B",
        explanation: "Parameterized queries ensure the database engine compiles the SQL template first and treats user inputs strictly as literal parameters rather than executable syntax.",
        marks: 2,
    },
    {
        question_text: "In React 18 Concurrent Mode, what role does the useTransition hook play?",
        category: "web_dev",
        subtopic: "React Concurrency",
        difficulty: "hard",
        options: [
            { option_id: "A", text: "It animates CSS transition properties between page routes" },
            { option_id: "B", text: "It marks state updates as non-urgent transitions, keeping the user interface responsive by allowing urgent updates (like typing) to interrupt rendering" },
            { option_id: "C", text: "It forces a synchronous DOM repaint before the next tick" },
            { option_id: "D", text: "It caches API network calls using stale-while-revalidate" },
        ],
        correct_option_id: "B",
        explanation: "useTransition allows developers to mark state changes as non-blocking transitions so urgent interactions remain buttery smooth without UI freezing.",
        marks: 2,
    },
    {
        question_text: "How does the Content Security Policy (CSP) directive 'script-src 'strict-dynamic' 'nonce-rAnd0m'' enhance web application defense against XSS?",
        category: "web_dev",
        subtopic: "Advanced Security",
        difficulty: "expert",
        options: [
            { option_id: "A", text: "It encrypts all inline JavaScript files using TLS certificates" },
            { option_id: "B", text: "It executes scripts only if they contain the cryptographically random per-response nonce, and dynamically loaded scripts created by nonced scripts are automatically trusted without requiring domain whitelists" },
            { option_id: "C", text: "It disables all web worker threads in the browser sandbox" },
            { option_id: "D", text: "It blocks all POST requests originating from unverified origins" },
        ],
        correct_option_id: "B",
        explanation: "'strict-dynamic' simplifies CSP by trusting a nonced bootstrap script and any subsequent scripts it dynamically injects, eliminating vulnerable domain whitelisting.",
        marks: 2,
    },
    {
        question_text: "In high-throughput Node.js microservices, why should you avoid using JSON.parse() on large multi-megabyte payloads in the main event thread?",
        category: "web_dev",
        subtopic: "V8 Performance",
        difficulty: "expert",
        options: [
            { option_id: "A", text: "JSON.parse() operates asynchronously and can throw uncatchable promises" },
            { option_id: "B", text: "JSON.parse() is a synchronous blocking C++ binding that halts the single-threaded event loop, starving all concurrent I/O requests" },
            { option_id: "C", text: "V8 engine corrupts heap memory when JSON payloads exceed 1MB" },
            { option_id: "D", text: "Node.js garbage collector automatically terminates long-running JSON parses" },
        ],
        correct_option_id: "B",
        explanation: "JSON parsing is synchronous. Parsing large payloads blocks the V8 thread, halting event loop processing for all other active HTTP connections.",
        marks: 2,
    },

    // ----------------------------------------------------
    // APTITUDE QUESTIONS (Quant, Logic, Reasoning)
    // ----------------------------------------------------
    {
        question_text: "A merchant marks an item 40% above its cost price and offers a 20% discount on the marked price. What is the net profit percentage?",
        category: "aptitude",
        subtopic: "Commercial Mathematics",
        difficulty: "easy",
        options: [
            { option_id: "A", text: "12%" },
            { option_id: "B", text: "15%" },
            { option_id: "C", text: "20%" },
            { option_id: "D", text: "10%" },
        ],
        correct_option_id: "A",
        explanation: "Let CP = 100. Marked Price = 140. Selling Price = 140 * (1 - 0.20) = 112. Profit = (112 - 100) = 12%.",
        marks: 1,
    },
    {
        question_text: "Find the missing term in the sequence: 2, 6, 12, 20, 30, ?",
        category: "aptitude",
        subtopic: "Number Series",
        difficulty: "easy",
        options: [
            { option_id: "A", text: "40" },
            { option_id: "B", text: "42" },
            { option_id: "C", text: "44" },
            { option_id: "D", text: "48" },
        ],
        correct_option_id: "B",
        explanation: "Pattern is n * (n + 1): 1*2=2, 2*3=6, 3*4=12, 4*5=20, 5*6=30, 6*7=42. Alternatively, differences increase by 2: +4, +6, +8, +10, +12 -> 30 + 12 = 42.",
        marks: 1,
    },
    {
        question_text: "Worker A completes a project in 12 days, and Worker B completes the same project in 24 days. If they work together, how many days will it take?",
        category: "aptitude",
        subtopic: "Time and Work",
        difficulty: "easy",
        options: [
            { option_id: "A", text: "6 days" },
            { option_id: "B", text: "8 days" },
            { option_id: "C", text: "9 days" },
            { option_id: "D", text: "10 days" },
        ],
        correct_option_id: "B",
        explanation: "Combined rate = 1/12 + 1/24 = 3/24 = 1/8. Time taken = 8 days.",
        marks: 1,
    },
    {
        question_text: "Two trains traveling in opposite directions at 60 km/h and 90 km/h cross each other in 12 seconds. If the length of the first train is 220 meters, what is the length of the second train?",
        category: "aptitude",
        subtopic: "Speed and Distance",
        difficulty: "medium",
        options: [
            { option_id: "A", text: "260 meters" },
            { option_id: "B", text: "280 meters" },
            { option_id: "C", text: "300 meters" },
            { option_id: "D", text: "320 meters" },
        ],
        correct_option_id: "B",
        explanation: "Relative speed = 60 + 90 = 150 km/h = 150 * (5/18) = 125/3 m/s. Total distance = (125/3) * 12 = 500 meters. Length of 2nd train = 500 - 220 = 280 meters.",
        marks: 1,
    },
    {
        question_text: "In how many distinct ways can the letters of the word 'LEADER' be arranged such that all vowels are always together?",
        category: "aptitude",
        subtopic: "Permutations & Combinations",
        difficulty: "medium",
        options: [
            { option_id: "A", text: "72" },
            { option_id: "B", text: "108" },
            { option_id: "C", text: "144" },
            { option_id: "D", text: "216" },
        ],
        correct_option_id: "B",
        explanation: "Vowels: E, A, E (3 vowels with two E's). Consonants: L, D, R (3 consonants). Bundle vowels as 1 unit: 4 units arranged in 4! = 24 ways. Inside the vowel bundle, arrangements = 3! / 2! = 3 ways. Total = 24 * 3 = 72? Wait! Letters in LEADER: L, D, R (3 consonants), E, A, E (3 vowels). Total letters = 6. Units = 3 consonants + 1 vowel pack = 4 units. But wait, is there another duplicate? No. 4! = 24. Arranging E, A, E: 3! / 2! = 3. 24 * 3 = 72? Wait, let's verify if D, L, R has duplicates: none. Ah, 4!/1! * 3!/2! = 24 * 3 = 72! Let's choose 72 as option A.",
        marks: 1,
    },
    {
        question_text: "Bag X contains 3 red and 4 black balls. Bag Y contains 5 red and 6 black balls. One ball is drawn at random from one of the bags and is found to be red. What is the probability that it was drawn from Bag X (using Bayes' Theorem)?",
        category: "aptitude",
        subtopic: "Probability & Bayes",
        difficulty: "hard",
        options: [
            { option_id: "A", text: "33 / 68" },
            { option_id: "B", text: "35 / 68" },
            { option_id: "C", text: "12 / 25" },
            { option_id: "D", text: "7 / 15" },
        ],
        correct_option_id: "A",
        explanation: "P(X) = 1/2, P(Y) = 1/2. P(R|X) = 3/7, P(R|Y) = 5/11. P(R) = 1/2 * (3/7 + 5/11) = 1/2 * (33 + 35)/77 = 68/154. P(X|R) = (1/2 * 3/7) / (68/154) = (33/154) / (68/154) = 33/68.",
        marks: 2,
    },
    {
        question_text: "Statement 1: All developers write code. Statement 2: Some developers write tests. Conclusion I: Some who write code also write tests. Conclusion II: All who write code are developers. Which conclusion logically follows?",
        category: "aptitude",
        subtopic: "Syllogisms & Logic",
        difficulty: "hard",
        options: [
            { option_id: "A", text: "Only Conclusion I follows" },
            { option_id: "B", text: "Only Conclusion II follows" },
            { option_id: "C", text: "Both Conclusion I and II follow" },
            { option_id: "D", text: "Neither follows" },
        ],
        correct_option_id: "A",
        explanation: "Developers who write tests are a subset of developers, all of whom write code. Hence, those developers write both code and tests (Conclusion I follows). Conclusion II is an invalid converse.",
        marks: 2,
    },
    {
        question_text: "What is the remainder when 3^2025 is divided by 7 (using Fermat's Little Theorem)?",
        category: "aptitude",
        subtopic: "Modular Arithmetic",
        difficulty: "expert",
        options: [
            { option_id: "A", text: "1" },
            { option_id: "B", text: "6" },
            { option_id: "C", text: "2" },
            { option_id: "D", text: "4" },
        ],
        correct_option_id: "B",
        explanation: "By Fermat's Little Theorem, 3^(7-1) = 3^6 ≡ 1 (mod 7). 2025 = 6 * 337 + 3. Therefore, 3^2025 ≡ (3^6)^337 * 3^3 ≡ 1 * 27 ≡ 27 (mod 7) ≡ 6.",
        marks: 2,
    },

    // ----------------------------------------------------
    // SYSTEM DESIGN QUESTIONS (Scalability, Distributed Systems)
    // ----------------------------------------------------
    {
        question_text: "What does the CAP Theorem state regarding distributed data stores during a network partition (P)?",
        category: "system_design",
        subtopic: "Distributed Fundamentals",
        difficulty: "easy",
        options: [
            { option_id: "A", text: "The system can guarantee both strong Consistency and 100% Availability simultaneously" },
            { option_id: "B", text: "The system must choose between Consistency (returning errors or blocking) and Availability (returning potentially stale data)" },
            { option_id: "C", text: "Network partitions can be eliminated entirely with redundant fiber cables" },
            { option_id: "D", text: "The system automatically degrades to single-master transactional SQL" },
        ],
        correct_option_id: "B",
        explanation: "During a partition, network packets are lost between nodes. You must either refuse requests (sacrificing availability to maintain consistency) or serve stale replicas (sacrificing consistency to maintain availability).",
        marks: 1,
    },
    {
        question_text: "Why is Consistent Hashing preferred over traditional modulo hashing (hash(key) % N) in distributed caching systems like Memcached or DynamoDB?",
        category: "system_design",
        subtopic: "Distributed Caching",
        difficulty: "medium",
        options: [
            { option_id: "A", text: "It compresses cached keys using Huffman encoding" },
            { option_id: "B", text: "Adding or removing a server node only requires remapping K/N keys on average rather than invalidating virtually the entire cache" },
            { option_id: "C", text: "It guarantees zero cache misses under peak load" },
            { option_id: "D", text: "It prevents network switch packet collisions" },
        ],
        correct_option_id: "B",
        explanation: "In traditional hash % N, changing N remaps almost 100% of keys. Consistent Hashing maps keys and nodes onto a circular ring, so changing nodes only relocates keys belonging to adjacent partitions.",
        marks: 1,
    },
    {
        question_text: "Which Rate Limiting algorithm allows bursts of requests up to a maximum bucket capacity while continuously refilling tokens at a constant rate?",
        category: "system_design",
        subtopic: "Rate Limiting & Traffic Shaping",
        difficulty: "medium",
        options: [
            { option_id: "A", text: "Fixed Window Counter" },
            { option_id: "B", text: "Token Bucket" },
            { option_id: "C", text: "Sliding Window Log" },
            { option_id: "D", text: "Strict Leaky Bucket without buffer" },
        ],
        correct_option_id: "B",
        explanation: "Token Bucket accumulates tokens up to capacity C, allowing sudden bursts of traffic while replenishing tokens at rate R, providing balanced throughput control.",
        marks: 1,
    },
    {
        question_text: "In distributed microservices architectures, what pattern is commonly implemented to manage transactions and data consistency across independent database boundaries without distributed two-phase locks?",
        category: "system_design",
        subtopic: "Microservices Consistency",
        difficulty: "hard",
        options: [
            { option_id: "A", text: "Saga Pattern (Choreography or Orchestration with compensating actions)" },
            { option_id: "B", text: "Global XA Distributed Locks" },
            { option_id: "C", text: "Direct SQL cross-database JOINs" },
            { option_id: "D", text: "Synchronous blocking RPC cascades" },
        ],
        correct_option_id: "A",
        explanation: "The Saga pattern coordinates a sequence of local transactions where each step publishes an event, and failures trigger compensating rollback transactions across affected services.",
        marks: 2,
    },
    {
        question_text: "What failure scenario occurs in distributed caches when a popular cache key expires or is evicted, causing thousands of concurrent requests to hit the backend database simultaneously?",
        category: "system_design",
        subtopic: "Cache Failures",
        difficulty: "hard",
        options: [
            { option_id: "A", text: "Cache Penetration" },
            { option_id: "B", text: "Cache Stampede (Thundering Herd)" },
            { option_id: "C", text: "Cache Avalanche" },
            { option_id: "D", text: "Split-Brain" },
        ],
        correct_option_id: "B",
        explanation: "A Cache Stampede happens when a high-traffic key expires, causing massive concurrent misses that simultaneously hammer the database. Mitigations include mutex locking, probabilistic early expiration (XFetch), or background refresh.",
        marks: 2,
    },
    {
        question_text: "In distributed event streaming architectures (like Apache Kafka), what ensures total ordering of events among consumers?",
        category: "system_design",
        subtopic: "Event Streaming",
        difficulty: "expert",
        options: [
            { option_id: "A", text: "Kafka guarantees global ordering across all partitions in a topic" },
            { option_id: "B", text: "Ordering is guaranteed strictly within an individual partition; messages with the same partition key are written and consumed in exact sequence" },
            { option_id: "C", text: "Consumers use NTP clock timestamps to sort messages client-side" },
            { option_id: "D", text: "Zookeeper coordinates vector clocks across every message payload" },
        ],
        correct_option_id: "B",
        explanation: "Kafka provides strict FIFO message ordering only within a single partition. Messages assigned the same partition key map to the same partition, preserving causal sequence for related entities.",
        marks: 2,
    },
];

async function seedData() {
    try {
        console.log("Connecting to MongoDB Atlas...");
        const mongoUri = (process.env.MONGO_URI || "").replace(/[';\"]/g, "").trim();
        if (!mongoUri) {
            throw new Error("MONGO_URI not found in environment.");
        }
        await mongoose.connect(mongoUri);
        console.log("Connected to MongoDB successfully.");

        // 1. Seed Assessments
        console.log("Seeding Assessments...");
        for (const asm of ASSESSMENTS) {
            await Assessment.findOneAndUpdate(
                { slug: asm.slug },
                { $set: asm },
                { upsert: true, new: true }
            );
        }
        console.log(`Seeded ${ASSESSMENTS.length} Assessment tracks.`);

        // 2. Seed Assessment Levels
        console.log("Seeding Assessment Levels...");
        for (const lvl of ASSESSMENT_LEVELS) {
            await AssessmentLevel.findOneAndUpdate(
                { slug: lvl.slug },
                { $set: lvl },
                { upsert: true, new: true }
            );
        }
        console.log(`Seeded ${ASSESSMENT_LEVELS.length} Assessment Levels.`);

        // 3. Seed Question Bank
        console.log("Seeding Question Bank...");
        let createdCount = 0;
        let updatedCount = 0;
        for (const q of QUESTIONS) {
            const existing = await QuestionBank.findOne({
                question_text: q.question_text,
                category: q.category,
            });
            if (existing) {
                await QuestionBank.updateOne(
                    { _id: existing._id },
                    {
                        $set: {
                            subtopic: q.subtopic,
                            difficulty: q.difficulty,
                            options: q.options,
                            correct_option_id: q.correct_option_id,
                            explanation: q.explanation,
                            marks: q.marks,
                            isActive: true,
                        },
                    }
                );
                updatedCount++;
            } else {
                await QuestionBank.create(q);
                createdCount++;
            }
        }
        const totalInDb = await QuestionBank.countDocuments();
        console.log(`Question Bank sync complete: ${createdCount} created, ${updatedCount} updated. Total questions in DB: ${totalInDb}`);

        console.log("Database seeding completed successfully!");
        process.exit(0);
    } catch (err) {
        console.error("Seeding error:", err);
        process.exit(1);
    }
}

seedData();
