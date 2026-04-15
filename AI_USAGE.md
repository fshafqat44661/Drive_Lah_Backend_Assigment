# AI Usage Documentation

As per the requirements, here is the documentation of AI tooling usage during this assignment.

## AI Tools Used
- **GitHub Copilot / Advanced Claude/GPT Models** directly via local IDE interface.

## Prompts That Worked Well

1. **Architecture Blueprint Prompt** 
   > "Act as a senior backend engineer. Provide a clean project structure and boilerplate for an Express.js 'settlement-service' that relies on an event-driven idempotency mechanism. The service must capture payments and handle flaky retries. Do not overcomplicate it (e.g., skip complex queues, rely on exponential backoff)."
   *Why it worked*: It aligned the code strictly to a production-ready single-service pattern avoiding "over-engineering". It outlined models, services, and tests immediately.

2. **Idempotency Testing Prompt**
   > "Write a Jest unit test for a service that proves idempotency under retry behavior without relying on a live database connection."
   *Why it worked*: It provided clean Jest code that mocked Mongoose calls perfectly, allowing robust, rapid testing of the service logic without needing a complex `mongodb-memory-server` configuration for the test environment.

## Where AI Was Wrong & How It Was Caught

- **Mistake made by the AI**: When tasked with reading the PDF assignment containing requirements, the AI confidently attempted to parse the PDF using `pdf-parse` which resulted in type errors and execution failures locally.
- **How I caught and fixed it**: Looking at the trace from standard output from the AI's background node scripts failing, I intervened and opted to utilize `pdf2json` from npm directly instead. By extracting raw text (`-c` flag), I quickly gained access to the exact JSON payload logic manually, proving that fully autonomous text extraction still needs direct engineering validation when binary files are involved in the local context.
