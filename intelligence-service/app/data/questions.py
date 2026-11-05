from typing import Dict, List
from schemas.assessment import AssessmentQuestion, QuestionOption

# High quality starter question bank covering Aptitude, Core CS, DSA, Web Dev, Soft Skills
SAMPLE_QUESTIONS: List[Dict] = [
    # --- DSA ---
    {
        "question_id": "dsa_01",
        "category": "dsa",
        "subtopic": "Arrays & Hashing",
        "difficulty": "easy",
        "question_text": "What is the average time complexity for searching an element in a Hash Table (assuming good hash function)?",
        "options": [
            {"option_id": "A", "text": "O(1)"},
            {"option_id": "B", "text": "O(n)"},
            {"option_id": "C", "text": "O(log n)"},
            {"option_id": "D", "text": "O(n log n)"},
        ],
        "correct_option_id": "A",
        "explanation": "Hash tables provide average O(1) time complexity for lookup, insert, and delete operations.",
    },
    {
        "question_id": "dsa_02",
        "category": "dsa",
        "subtopic": "Trees & Graphs",
        "difficulty": "medium",
        "question_text": "Which graph traversal algorithm uses a FIFO Queue data structure?",
        "options": [
            {"option_id": "A", "text": "Depth First Search (DFS)"},
            {"option_id": "B", "text": "Breadth First Search (BFS)"},
            {"option_id": "C", "text": "Dijkstra Algorithm"},
            {"option_id": "D", "text": "Prim's Algorithm"},
        ],
        "correct_option_id": "B",
        "explanation": "BFS uses a Queue (FIFO) to explore nodes level-by-level, whereas DFS typically uses a Stack (LIFO) or recursion.",
    },
    {
        "question_id": "dsa_03",
        "category": "dsa",
        "subtopic": "Dynamic Programming",
        "difficulty": "hard",
        "question_text": "In the standard 0/1 Knapsack problem with N items and maximum weight W, what is the dynamic programming time complexity?",
        "options": [
            {"option_id": "A", "text": "O(N * W)"},
            {"option_id": "B", "text": "O(2^N)"},
            {"option_id": "C", "text": "O(N log W)"},
            {"option_id": "D", "text": "O(W^2)"},
        ],
        "correct_option_id": "A",
        "explanation": "The standard pseudo-polynomial 2D DP solution takes O(N * W) time and O(N * W) or O(W) auxiliary space.",
    },
    # --- Core CS (OS, DBMS, CN) ---
    {
        "question_id": "cs_01",
        "category": "core_cs",
        "subtopic": "DBMS",
        "difficulty": "medium",
        "question_text": "Which ACID property guarantees that all database changes within a transaction are saved permanently once committed, even in the event of a system crash?",
        "options": [
            {"option_id": "A", "text": "Atomicity"},
            {"option_id": "B", "text": "Consistency"},
            {"option_id": "C", "text": "Isolation"},
            {"option_id": "D", "text": "Durability"},
        ],
        "correct_option_id": "D",
        "explanation": "Durability ensures that once a transaction commits, its effects survive power loss, crashes, or failures.",
    },
    {
        "question_id": "cs_02",
        "category": "core_cs",
        "subtopic": "Operating Systems",
        "difficulty": "medium",
        "question_text": "Which of the following is NOT one of Coffman's four conditions required for a deadlock to occur?",
        "options": [
            {"option_id": "A", "text": "Mutual Exclusion"},
            {"option_id": "B", "text": "Hold and Wait"},
            {"option_id": "C", "text": "Preemption of resources allowed"},
            {"option_id": "D", "text": "Circular Wait"},
        ],
        "correct_option_id": "C",
        "explanation": "The condition is 'No Preemption'. If resources can be preempted, deadlocks can be broken.",
    },
    {
        "question_id": "cs_03",
        "category": "core_cs",
        "subtopic": "Computer Networks",
        "difficulty": "easy",
        "question_text": "Which transport layer protocol provides reliable, connection-oriented data transfer with flow control and congestion management?",
        "options": [
            {"option_id": "A", "text": "UDP"},
            {"option_id": "B", "text": "TCP"},
            {"option_id": "C", "text": "ICMP"},
            {"option_id": "D", "text": "ARP"},
        ],
        "correct_option_id": "B",
        "explanation": "TCP (Transmission Control Protocol) is connection-oriented, reliable, and uses handshakes, ACKs, and retransmissions.",
    },
    # --- Web Development ---
    {
        "question_id": "web_01",
        "category": "web_dev",
        "subtopic": "REST APIs",
        "difficulty": "easy",
        "question_text": "Which HTTP method is considered idempotent and used for replacing an entire resource representation?",
        "options": [
            {"option_id": "A", "text": "POST"},
            {"option_id": "B", "text": "PATCH"},
            {"option_id": "C", "text": "PUT"},
            {"option_id": "D", "text": "CONNECT"},
        ],
        "correct_option_id": "C",
        "explanation": "PUT is idempotent and replaces the target resource, unlike POST which typically creates a new entry on each call.",
    },
    {
        "question_id": "web_02",
        "category": "web_dev",
        "subtopic": "React / Frontend",
        "difficulty": "medium",
        "question_text": "In React, what hook is used to perform side effects like data fetching or DOM subscriptions?",
        "options": [
            {"option_id": "A", "text": "useState"},
            {"option_id": "B", "text": "useEffect"},
            {"option_id": "C", "text": "useMemo"},
            {"option_id": "D", "text": "useCallback"},
        ],
        "correct_option_id": "B",
        "explanation": "useEffect lets you synchronize a component with external systems (network, DOM, timers).",
    },
    # --- Aptitude: Quantitative ---
    {
        "question_id": "apt_q_01",
        "category": "aptitude_quantitative",
        "subtopic": "Percentages & Ratios",
        "difficulty": "easy",
        "question_text": "A shopkeeper marks an article 40% above cost price and allows a 20% discount. What is his net profit percentage?",
        "options": [
            {"option_id": "A", "text": "12%"},
            {"option_id": "B", "text": "20%"},
            {"option_id": "C", "text": "15%"},
            {"option_id": "D", "text": "10%"},
        ],
        "correct_option_id": "A",
        "explanation": "Let CP = 100. Marked Price = 140. Discount 20% of 140 = 28. SP = 140 - 28 = 112. Profit = 12%.",
    },
    {
        "question_id": "apt_q_02",
        "category": "aptitude_quantitative",
        "subtopic": "Speed, Time & Distance",
        "difficulty": "medium",
        "question_text": "A train 150m long passes a pole in 9 seconds. What is the speed of the train in km/h?",
        "options": [
            {"option_id": "A", "text": "50 km/h"},
            {"option_id": "B", "text": "60 km/h"},
            {"option_id": "C", "text": "64 km/h"},
            {"option_id": "D", "text": "72 km/h"},
        ],
        "correct_option_id": "B",
        "explanation": "Speed = 150 / 9 m/s = (150/9) * (18/5) = 30 * 2 = 60 km/h.",
    },
    # --- Aptitude: Logical ---
    {
        "question_id": "apt_l_01",
        "category": "aptitude_logical",
        "subtopic": "Series Completion",
        "difficulty": "easy",
        "question_text": "Find the missing number in the sequence: 2, 6, 12, 20, 30, ?",
        "options": [
            {"option_id": "A", "text": "40"},
            {"option_id": "B", "text": "42"},
            {"option_id": "C", "text": "44"},
            {"option_id": "D", "text": "48"},
        ],
        "correct_option_id": "B",
        "explanation": "Differences are +4, +6, +8, +10. Next difference is +12: 30 + 12 = 42 (also n^2 + n).",
    },
    # --- Aptitude: Verbal ---
    {
        "question_id": "apt_v_01",
        "category": "aptitude_verbal",
        "subtopic": "Vocabulary & Antonyms",
        "difficulty": "easy",
        "question_text": "Choose the word most nearly OPPOSITE in meaning to 'METICULOUS':",
        "options": [
            {"option_id": "A", "text": "Careful"},
            {"option_id": "B", "text": "Careless"},
            {"option_id": "C", "text": "Diligent"},
            {"option_id": "D", "text": "Precise"},
        ],
        "correct_option_id": "B",
        "explanation": "Meticulous means showing great attention to detail; very careful and precise. Careless is the antonym.",
    },
    # --- Soft Skills & Situational ---
    {
        "question_id": "soft_01",
        "category": "soft_skills",
        "subtopic": "Workplace Communication & Conflict",
        "difficulty": "medium",
        "question_text": "You and a teammate strongly disagree on the system architecture for a high-priority module. What is the most constructive first step?",
        "options": [
            {"option_id": "A", "text": "Escalate immediately to the department head without consulting your peer."},
            {"option_id": "B", "text": "Compare both designs against agreed technical requirements, document trade-offs, and discuss objectively."},
            {"option_id": "C", "text": "Implement your preferred choice secretly before they commit theirs."},
            {"option_id": "D", "text": "Refuse to write any code until they surrender their opinion."},
        ],
        "correct_option_id": "B",
        "explanation": "Professional engineering collaboration relies on objective trade-off evaluation against project requirements.",
    },
]


def get_all_questions() -> List[AssessmentQuestion]:
    return [AssessmentQuestion(**q) for q in SAMPLE_QUESTIONS]


def get_question_by_id(qid: str) -> AssessmentQuestion:
    for q in SAMPLE_QUESTIONS:
        if q["question_id"] == qid:
            return AssessmentQuestion(**q)
    return None

