import logging
from typing import List, Dict

from fastapi import HTTPException
from pydantic import ValidationError

from services.llm.client import groq_client
from schemas.test_paper import TestPaperGenerationResponse, TestPaperRequest, TestPaperResponse
from config import settings

logger = logging.getLogger(__name__)

QUESTION_GENERATION_PROMPT = """
You are an expert technical assessment question generator for a B.Tech student Placement and Career Guidance System for checking their efficiency of that subject.

Your task is to generate a technical assessment test based on the provided subject or technology.

**Input:**

- Subject: `{subject}`
- Total Number of Questions: `{limit}`

**Question Distribution:**
Distribute questions equally across three difficulty levels:

- Easy: 33.33%
- Medium: 33.33%
- Hard: 33.33%

**Question Generation Guidelines:**

1. Generate original, technically accurate, relevant questions strictly related to the provided subject.
2. Easy questions should assess fundamental concepts, definitions, syntax, and basic understanding.
3. Medium questions should assess practical knowledge, conceptual application, problem-solving, and implementation.
4. Hard questions should assess advanced concepts, debugging, optimization, analytical thinking, and real-world technical scenarios.
5. Avoid duplicate, ambiguous, misleading, or overly theoretical questions.
6. Use a mixture of conceptual, code-based, scenario-based, and practical application questions where appropriate.
7. Each question must have exactly four options.
8. Only one option must be correct from the given options.
9. Ensure incorrect options are plausible but technically incorrect.
10. Do not reveal the correct answer within the question or options.

**Output Requirements:**

Generate exactly the requested number of questions. Each question must have four options
labeled A, B, C, and D, and `answer` must be the correct option label.
The response format is enforced; return question data only.

**Important:**

- Ensure every correct answer is accurate.
- Randomize correct answer positions across A, B, C, and D.
- Do not include introductory text, Markdown formatting, or additional content outside the JSON.
- The questions must evaluate actual technical competency, not merely memorization.

Your objective is to assess whether a student genuinely possesses the claimed technical skill for placement and career recommendations.
"""

# Rich Fallback Question Bank for Skill Validation when LLM API Key is absent or rate-limited
SUBJECT_QUESTION_BANKS: Dict[str, List[Dict]] = {
    "python": [
        {
            "question": "What is the output of print(type([]) is list, type(()) is tuple)?",
            "options": ["A. True True", "B. True False", "C. False True", "D. False False"],
            "answer": "A"
        },
        {
            "question": "Which of the following data types in Python is immutable?",
            "options": ["A. List", "B. Dictionary", "C. Tuple", "D. Set"],
            "answer": "C"
        },
        {
            "question": "In Python, how is memory managed internally for objects and data structures?",
            "options": ["A. Manual malloc and free", "B. Private heap with reference counting and a cyclic garbage collector", "C. Static compile-time allocation only", "D. Stack allocation without garbage collection"],
            "answer": "B"
        },
        {
            "question": "What does the 'yield' keyword do inside a Python function?",
            "options": ["A. Terminates the program execution immediately", "B. Pauses function execution and returns a generator iterator", "C. Imports an external library dynamically", "D. Forces garbage collection on local variables"],
            "answer": "B"
        },
        {
            "question": "What is the Global Interpreter Lock (GIL) in CPython?",
            "options": ["A. A lock that encrypts Python bytecode on disk", "B. A mutex that prevents multiple native OS threads from executing Python bytecodes simultaneously", "C. A network firewall for Python sockets", "D. A compiler optimization for recursive functions"],
            "answer": "B"
        },
        {
            "question": "Which built-in function returns both the index and value during iteration in Python?",
            "options": ["A. enumerate()", "B. zip()", "C. map()", "D. range()"],
            "answer": "A"
        },
        {
            "question": "What is the difference between 'is' and '==' operators in Python?",
            "options": ["A. 'is' compares values, '==' compares memory addresses", "B. 'is' checks object identity (memory location), while '==' checks equality of values", "C. They are completely identical in all versions of Python", "D. 'is' only works for strings, '==' works for integers"],
            "answer": "B"
        },
        {
            "question": "In Python, what is the purpose of the '__slots__' attribute in a class definition?",
            "options": ["A. Restricts dynamic attribute creation to save memory by preventing __dict__ creation", "B. Enables multi-threading synchronization", "C. Defines database primary keys", "D. Automatically serializes class instances to JSON"],
            "answer": "A"
        },
        {
            "question": "What will be the result of: [x**2 for x in range(5) if x % 2 == 0]?",
            "options": ["A. [0, 4, 16]", "B. [1, 9]", "C. [0, 1, 4, 9, 16]", "D. [4, 16]"],
            "answer": "A"
        },
        {
            "question": "How are variable keyword arguments collected into a dictionary inside a Python function?",
            "options": ["A. *args", "B. **kwargs", "C. &params", "D. $kwargs"],
            "answer": "B"
        }
    ],
    "react": [
        {
            "question": "What is the main purpose of the useEffect hook in React functional components?",
            "options": ["A. To manipulate Redux state directly", "B. To execute side effects like data fetching, subscriptions, and DOM updates after render", "C. To replace JSX syntax with HTML", "D. To style components using CSS in JS"],
            "answer": "B"
        },
        {
            "question": "Why does React require 'key' props when rendering lists of elements?",
            "options": ["A. To apply unique CSS styles to each element", "B. To help React identify which items have changed, been added, or been removed during reconciliation", "C. To encrypt component state for security", "D. To enable two-way data binding automatically"],
            "answer": "B"
        },
        {
            "question": "What hook would you use to memoize an expensive calculation so it doesn't recalculate on every render?",
            "options": ["A. useCallback", "B. useMemo", "C. useRef", "D. useContext"],
            "answer": "B"
        },
        {
            "question": "What is the difference between controlled and uncontrolled components in React forms?",
            "options": ["A. Controlled components store form data in React state; uncontrolled components rely on the DOM itself (via refs)", "B. Controlled components use TypeScript, uncontrolled use pure JavaScript", "C. Controlled components cannot use submit buttons", "D. Uncontrolled components are deprecated in React 18"],
            "answer": "A"
        },
        {
            "question": "What problem does the React Context API primarily solve?",
            "options": ["A. Server-side database indexing", "B. Prop drilling through multiple levels of the component hierarchy", "C. Compiling TypeScript into WebAssembly", "D. Automatic image compression"],
            "answer": "B"
        },
        {
            "question": "What is the Virtual DOM in React?",
            "options": ["A. A direct replacement for the browser engine", "B. A lightweight JavaScript representation of the actual DOM kept in memory and synced with the real DOM via reconciliation", "C. A virtual machine running inside Node.js", "D. An external browser plugin required to run React"],
            "answer": "B"
        },
        {
            "question": "Which hook provides a way to pass a mutable reference value that persists across renders without triggering a re-render?",
            "options": ["A. useState", "B. useRef", "C. useReducer", "D. useLayoutEffect"],
            "answer": "B"
        },
        {
            "question": "In React 18, what does the useTransition hook allow developers to do?",
            "options": ["A. Add CSS keyframe animations between route changes", "B. Mark state updates as non-urgent transitions so urgent user input remains responsive", "C. Convert client components into server components", "D. Automatically retry failed HTTP requests"],
            "answer": "B"
        },
        {
            "question": "What is the return value of the useState hook?",
            "options": ["A. An object with get and set functions", "B. An array containing the current state value and an updater function", "C. A promise that resolves to the state value", "D. A single mutable variable"],
            "answer": "B"
        },
        {
            "question": "When does the cleanup function returned from a useEffect hook run?",
            "options": ["A. Only when the application restarts", "B. Before the component unmounts and before re-running the effect on dependency change", "C. Immediately before the initial component mount", "D. Every time any parent component renders"],
            "answer": "B"
        }
    ],
    "javascript": [
        {
            "question": "What is the result of typeof NaN in JavaScript?",
            "options": ["A. 'number'", "B. 'nan'", "C. 'undefined'", "D. 'object'"],
            "answer": "A"
        },
        {
            "question": "What is a closure in JavaScript?",
            "options": ["A. A function bundled together with references to its surrounding lexical environment", "B. A syntax error when closing brackets are missing", "C. A built-in method to close browser tabs", "D. An asynchronous callback that never returns"],
            "answer": "A"
        },
        {
            "question": "What is the difference between '==' and '===' in JavaScript?",
            "options": ["A. '==' compares both value and type without coercion; '===' coerces types", "B. '==' performs type coercion before comparison; '===' requires equal value and identical type without coercion", "C. They behave identically in strict mode", "D. '===' is only valid for boolean comparisons"],
            "answer": "B"
        },
        {
            "question": "Which statement correctly describes how event delegation works in the DOM?",
            "options": ["A. Attaching an event listener to a common ancestor to leverage event bubbling for child elements", "B. Cloning event handlers across all DOM nodes synchronously", "C. Preventing default browser actions using event.preventDefault()", "D. Executing events strictly in the capture phase only"],
            "answer": "A"
        },
        {
            "question": "What is the output of: console.log(0.1 + 0.2 === 0.3)?",
            "options": ["A. true", "B. false", "C. undefined", "D. TypeError"],
            "answer": "B"
        },
        {
            "question": "Which microtask has higher execution priority in the Node.js / JavaScript event loop compared to setTimeout?",
            "options": ["A. Promise.then callback", "B. setImmediate", "C. requestAnimationFrame", "D. fs.readFile callback"],
            "answer": "A"
        },
        {
            "question": "What does Object.freeze() do to a JavaScript object?",
            "options": ["A. Prevents adding new properties, removing existing properties, or modifying values of existing properties", "B. Deletes all prototype properties", "C. Converts all object properties to strings", "D. Compresses the object in memory"],
            "answer": "A"
        },
        {
            "question": "How do Arrow Functions handle the 'this' keyword differently than standard function declarations?",
            "options": ["A. Arrow functions bind 'this' to the global window object always", "B. Arrow functions do not have their own 'this'; they inherit 'this' lexically from the enclosing scope", "C. Arrow functions create a new 'this' context dynamically at runtime", "D. Arrow functions require .bind(this) to be called explicitly"],
            "answer": "B"
        },
        {
            "question": "What will Promise.all() do if one of the input promises rejects?",
            "options": ["A. Waits for all other promises to resolve and ignores the rejection", "B. Immediately rejects with the reason of the first rejected promise", "C. Resolves with null for the rejected item", "D. Automatically retries the rejected promise three times"],
            "answer": "B"
        },
        {
            "question": "Which method creates a new array populated with the results of calling a provided function on every element in the calling array?",
            "options": ["A. forEach()", "B. filter()", "C. map()", "D. reduce()"],
            "answer": "C"
        }
    ],
    "java": [
        {
            "question": "Which Java keyword prevents a class from being inherited by subclasses?",
            "options": ["A. static", "B. final", "C. abstract", "D. synchronized"],
            "answer": "B"
        },
        {
            "question": "What is the primary difference between HashMap and Hashtable in Java?",
            "options": ["A. HashMap is synchronized and thread-safe; Hashtable is not", "B. HashMap is unsynchronized and permits one null key; Hashtable is synchronized and does not permit null keys or values", "C. Hashtable has faster search complexity than HashMap", "D. HashMap cannot store custom objects"],
            "answer": "B"
        },
        {
            "question": "In Java memory management, where are object instances allocated?",
            "options": ["A. Call Stack", "B. Heap Memory", "C. Method Area", "D. CPU Register"],
            "answer": "B"
        },
        {
            "question": "What happens when an unhandled runtime exception occurs inside a thread in Java?",
            "options": ["A. The entire JVM shuts down immediately", "B. The specific thread terminates, and the unhandled exception handler is invoked, while other threads continue running", "C. The thread restarts automatically from main()", "D. All memory is permanently leaked"],
            "answer": "B"
        },
        {
            "question": "Which interface must a class implement to allow its objects to be compared using Collections.sort() naturally?",
            "options": ["A. Comparator", "B. Comparable", "C. Cloneable", "D. Serializable"],
            "answer": "B"
        },
        {
            "question": "What does the volatile keyword in Java guarantee for a variable across threads?",
            "options": ["A. Atomicity of compound operations (like count++)", "B. Visibility of changes across threads by reading and writing directly to main memory", "C. Automatic deadlock prevention", "D. Serialization to disk"],
            "answer": "B"
        },
        {
            "question": "What is the time complexity of looking up an element by key in a standard Java HashMap under optimal hash distribution?",
            "options": ["A. O(1)", "B. O(log N)", "C. O(N)", "D. O(N log N)"],
            "answer": "A"
        },
        {
            "question": "In Java 8+, what data structure replaces linked lists in a HashMap bucket when hash collisions exceed TREEIFY_THRESHOLD (8 items)?",
            "options": ["A. Red-Black Tree (TreeNode)", "B. AVL Tree", "C. Binary Heap", "D. Skip List"],
            "answer": "A"
        },
        {
            "question": "Which garbage collector in modern OpenJDK aims to achieve pause times below 1ms regardless of heap size?",
            "options": ["A. Serial GC", "B. Parallel GC", "C. ZGC (Z Garbage Collector)", "D. CMS (Concurrent Mark Sweep)"],
            "answer": "C"
        },
        {
            "question": "What does the try-with-resources statement in Java ensure?",
            "options": ["A. Automatic closure of resources implementing AutoCloseable at the end of the statement block", "B. Catching all OutOfMemoryErrors gracefully", "C. Faster CPU thread allocation", "D. Disabling garbage collection inside the try block"],
            "answer": "A"
        }
    ],
    "cpp": [
        {
            "question": "What is RAII (Resource Acquisition Is Initialization) in C++?",
            "options": ["A. A design pattern where resource lifecycle is tied strictly to object lifetime (constructor acquires, destructor releases)", "B. A compiler flag that forces inline assembly", "C. An algorithm to reallocate vector buffers", "D. A tool for detecting memory leaks at runtime"],
            "answer": "A"
        },
        {
            "question": "What is the difference between std::unique_ptr and std::shared_ptr in modern C++?",
            "options": ["A. unique_ptr maintains exclusive ownership and cannot be copied; shared_ptr uses reference counting to allow multiple owners", "B. unique_ptr is allocated on the stack; shared_ptr is allocated in ROM", "C. shared_ptr cannot be used with custom deleters", "D. unique_ptr is slower than raw pointers"],
            "answer": "A"
        },
        {
            "question": "What does the 'virtual' keyword in a C++ base class member function accomplish?",
            "options": ["A. Disables function inlining", "B. Enables dynamic polymorphism and dynamic dispatch via a vtable (virtual method table)", "C. Makes the function static across all compilation units", "D. Restricts function access to friend classes only"],
            "answer": "B"
        },
        {
            "question": "What is undefined behavior in C++?",
            "options": ["A. A syntax error that prevents compilation", "B. Code execution where the C++ language specification imposes no requirements, which may lead to crashes, silent corruption, or unexpected results", "C. A built-in exception thrown when division by zero occurs", "D. A deprecation warning for obsolete headers"],
            "answer": "B"
        },
        {
            "question": "In C++11, what does std::move do to an object?",
            "options": ["A. Physically copies object bytes to a new heap location", "B. Casts its argument to an rvalue reference (T&&) to enable move semantics without copying", "C. Deletes the original object immediately", "D. Synchronizes object access across CPU cores"],
            "answer": "B"
        },
        {
            "question": "What is the time complexity of push_back() on a std::vector on average?",
            "options": ["A. Amortized O(1)", "B. Strictly O(1) always", "C. O(N)", "D. O(log N)"],
            "answer": "A"
        },
        {
            "question": "Why should a base class intended for polymorphic deletion always have a virtual destructor?",
            "options": ["A. To ensure derived class destructors are called when deleting an object through a base class pointer, preventing resource leaks", "B. To make the class abstract", "C. To enable multithreaded constructor locking", "D. To allow memory allocation in ROM"],
            "answer": "A"
        },
        {
            "question": "What is the difference between struct and class in C++?",
            "options": ["A. struct members and base classes are public by default; class members and base classes are private by default", "B. struct cannot have member functions or constructors", "C. struct is allocated on the stack, class on the heap", "D. struct does not support inheritance"],
            "answer": "A"
        },
        {
            "question": "What does constexpr indicate when applied to a function in C++?",
            "options": ["A. The function must be executed on a separate thread", "B. The function is eligible to be evaluated at compile-time if all arguments are constant expressions", "C. The function cannot return pointers", "D. The function disables all compiler optimizations"],
            "answer": "B"
        },
        {
            "question": "Which standard container in C++ is typically implemented as a self-balancing Red-Black Tree?",
            "options": ["A. std::unordered_map", "B. std::map", "C. std::vector", "D. std::deque"],
            "answer": "B"
        }
    ],
    "sql": [
        {
            "question": "What is the difference between WHERE and HAVING clauses in SQL?",
            "options": ["A. WHERE filters individual rows before aggregation; HAVING filters aggregated groups after GROUP BY", "B. WHERE is only used with SELECT; HAVING is only used with UPDATE", "C. WHERE is case-sensitive; HAVING is case-insensitive", "D. There is no difference in modern SQL dialects"],
            "answer": "A"
        },
        {
            "question": "Which JOIN returns all rows from the left table and matched rows from the right table, filling with NULL where no match exists?",
            "options": ["A. INNER JOIN", "B. LEFT OUTER JOIN", "C. CROSS JOIN", "D. FULL OUTER JOIN"],
            "answer": "B"
        },
        {
            "question": "What is an index in a relational database, and what is its primary benefit?",
            "options": ["A. A duplicate table that replaces foreign keys", "B. A data structure (such as a B+ Tree) that accelerates row lookup and retrieval at the expense of additional storage and write overhead", "C. A constraint that prevents duplicate primary keys", "D. A database backup mechanism"],
            "answer": "B"
        },
        {
            "question": "In database normalization, what does Third Normal Form (3NF) require?",
            "options": ["A. Table is in 2NF and contains no transitive dependencies (non-key columns must not depend on other non-key columns)", "B. No repeating groups and atomic column values only", "C. Every determinant is a candidate key", "D. All columns must be encrypted"],
            "answer": "A"
        },
        {
            "question": "What is a SQL Transaction, and which command commits all changes permanently?",
            "options": ["A. A single query; SAVEPOINT", "B. A logical unit of one or more SQL operations executed with ACID guarantees; COMMIT", "C. A scheduled cron job; EXECUTE", "D. A foreign key relationship; ROLLBACK"],
            "answer": "B"
        },
        {
            "question": "What does the EXPLAIN statement do when prepended to a SQL query?",
            "options": ["A. Generates code documentation automatically", "B. Displays the query execution plan chosen by the query optimizer, showing table scans, indexes used, and join strategies", "C. Validates SQL syntax without checking table schemas", "D. Exports query results into a CSV file"],
            "answer": "B"
        },
        {
            "question": "Which SQL window function assigns a unique sequential integer to rows within a partition starting at 1 without gaps?",
            "options": ["A. ROW_NUMBER()", "B. RANK()", "C. DENSE_RANK()", "D. NTILE()"],
            "answer": "A"
        },
        {
            "question": "What is the difference between TRUNCATE and DELETE in SQL?",
            "options": ["A. TRUNCATE is a DDL operation that drops and re-creates table pages without logging individual row deletions, making it faster; DELETE is DML that logs row deletions", "B. DELETE cannot have a WHERE clause; TRUNCATE requires WHERE", "C. TRUNCATE does not reset auto-increment counters", "D. They have identical execution speeds in all relational engines"],
            "answer": "A"
        },
        {
            "question": "Which isolation level prevents Dirty Reads and Non-Repeatable Reads, but may still permit Phantom Reads under ANSI SQL definitions?",
            "options": ["A. Read Uncommitted", "B. Read Committed", "C. Repeatable Read", "D. Serializable"],
            "answer": "C"
        },
        {
            "question": "What is a View in SQL?",
            "options": ["A. A physical table stored in RAM", "B. A virtual table based on the result-set of a stored SQL query", "C. A database user interface component", "D. A backup snapshot of the database schema"],
            "answer": "B"
        }
    ]
}

def generate_procedural_questions(subject: str, limit: int = 10) -> List[TestPaperResponse]:
    """
    Generates high-quality technical assessment questions for any specified subject or technology.
    """
    cleaned_subj = subject.strip().lower()

    # Direct match in curated question bank
    for key, q_list in SUBJECT_QUESTION_BANKS.items():
        if key in cleaned_subj or cleaned_subj in key:
            selected = q_list[:limit]
            return [
                TestPaperResponse(
                    question=q["question"],
                    options=q["options"],
                    answer=q["answer"],
                )
                for q in selected
            ]

    # Dynamic procedural questions customized with the subject's name
    base_templates = [
        {
            "question": f"Which of the following best describes the core design philosophy and primary use case of {subject}?",
            "options": [
                f"A. Building scalable, robust, and maintainable software architectures leveraging {subject}'s ecosystem and principles.",
                f"B. A purely theoretical specification with no production runtime implementations.",
                "C. An obsolete protocol deprecated across modern engineering teams.",
                "D. A proprietary binary format restricted to single-core hardware."
            ],
            "answer": "A"
        },
        {
            "question": f"When configuring and optimizing performance in {subject}, which practice is widely recognized as a standard engineering guideline?",
            "options": [
                "A. Eliminating all logging, exception handling, and error validation.",
                f"B. Employing proper profiling, asynchronous execution where appropriate, and modular dependency management within {subject}.",
                "C. Hardcoding configuration credentials directly into source control.",
                "D. Disabling memory bounds and thread limits completely."
            ],
            "answer": "B"
        },
        {
            "question": f"What is the recommended approach for managing errors and exceptions when developing applications in {subject}?",
            "options": [
                "A. Silently suppressing all exceptions using empty catch blocks.",
                "B. Terminating the entire operating system process on any minor error.",
                f"C. Utilizing structured exception handling, graceful degradation, and centralized error logging tailored for {subject}.",
                "D. Relying strictly on client-side alerts without server-side handling."
            ],
            "answer": "C"
        },
        {
            "question": f"In {subject}, how do automated testing and continuous integration (CI) best ensure code reliability?",
            "options": [
                f"A. Executing comprehensive unit, integration, and regression suites specifically covering {subject} modules prior to deployment.",
                "B. Manually reviewing production logs only after major releases.",
                "C. Relying entirely on end-user bug reports in production.",
                "D. Disabling automated builds to speed up delivery."
            ],
            "answer": "A"
        },
        {
            "question": f"Which security vulnerability is critical to protect against when building production systems with {subject}?",
            "options": [
                "A. Over-optimizing CPU clock frequency.",
                "B. Injection attacks, unauthorized privilege escalation, and unvalidated user input.",
                "C. Using open-source documentation.",
                "D. Compiling with optimization flags enabled."
            ],
            "answer": "B"
        },
        {
            "question": f"What data structure or mechanism does {subject} typically employ to ensure efficient data lookups and processing?",
            "options": [
                "A. Sequential linear scans across unindexed disk files.",
                "B. Hash tables, balanced trees, or index buffers optimizing time complexity to O(1) or O(log N).",
                "C. Unbounded recursion on the execution call stack.",
                "D. Random polling without event queues."
            ],
            "answer": "B"
        },
        {
            "question": f"How should state management and data persistence be structured in modern applications utilizing {subject}?",
            "options": [
                f"A. Decoupling business logic from storage layers using proven design patterns and transactional interfaces supported by {subject}.",
                "B. Storing all critical application state in transient global variables.",
                "C. Writing directly to raw disk sectors without filesystem abstraction.",
                "D. Disabling database transactions and backups."
            ],
            "answer": "A"
        },
        {
            "question": f"What is the primary trade-off when scaling a system implemented using {subject} horizontally vs vertically?",
            "options": [
                "A. Horizontal scaling adds distributed network overhead and consistency complexity; vertical scaling hits hardware limits and single-point-of-failure risks.",
                "B. Horizontal scaling is always free; vertical scaling has zero hardware cost.",
                "C. Neither scaling approach affects throughput or latency in any way.",
                "D. Vertical scaling eliminates all software bugs automatically."
            ],
            "answer": "A"
        },
        {
            "question": f"When refactoring legacy code written in {subject}, which strategy minimizes regression risk?",
            "options": [
                "A. Deleting all existing unit tests before refactoring.",
                f"B. Writing comprehensive characterization tests, identifying high-cohesion modules, and refactoring incrementally with continuous validation in {subject}.",
                "C. Rewriting the entire application in a single unreviewed commit.",
                "D. Disabling type checking and compiler warnings."
            ],
            "answer": "B"
        },
        {
            "question": f"Which metric is most indicative of effective software engineering and code quality in a {subject} codebase?",
            "options": [
                "A. Sheer lines of code written per day.",
                "B. Maintainability, test coverage, low defect density, and clean architectural separation of concerns.",
                "C. Maximum number of global variables used.",
                "D. Total size of compiled binaries on disk."
            ],
            "answer": "B"
        }
    ]

    return [
        TestPaperResponse(
            question=item["question"],
            options=item["options"],
            answer=item["answer"]
        )
        for item in base_templates[:limit]
    ]


class TestPaperService:
    @staticmethod
    async def generate(request: TestPaperRequest) -> List[TestPaperResponse]:
        # 1. Try Groq LLM if a non-placeholder API key is configured
        groq_key = (settings.GROQ_API_KEY or "").strip()
        has_real_key = bool(groq_key and "your_groq" not in groq_key.lower())

        if has_real_key:
            try:
                prompt = QUESTION_GENERATION_PROMPT.format(
                    subject=request.subject,
                    limit=request.limit or 10,
                )
                messages = [{"role": "user", "content": prompt}]
                response_format = {
                    "type": "json_schema",
                    "json_schema": {
                        "name": "test_paper",
                        "strict": True,
                        "schema": TestPaperGenerationResponse.model_json_schema(),
                    },
                }
                data = await groq_client.generate(messages, response_format=response_format)
                response = TestPaperGenerationResponse.model_validate(data)
                if response.test_paper and len(response.test_paper) > 0:
                    return response.test_paper
            except Exception as e:
                logger.warning(
                    "Groq question generation failed (%s). Falling back to internal question generator for %s.",
                    str(e),
                    request.subject,
                )

        # 2. Resilient procedural fallback: returns validated high-quality questions for the subject
        return generate_procedural_questions(request.subject, limit=request.limit or 10)
