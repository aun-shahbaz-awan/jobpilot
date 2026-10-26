/**
 * Skill dictionary used for free, offline skill extraction and matching.
 *
 * - `aliases` are matched case-insensitively on word boundaries.
 * - `related` gives partial credit: knowing Vue earns some credit for a React requirement.
 * - `weight` lowers the importance of generic skills (git, agile) in the match score.
 * Add your own entries freely; everything else adapts automatically.
 */
export type SkillCategory =
  | "Frontend"
  | "Web3"
  | "Backend"
  | "Data"
  | "Cloud & DevOps"
  | "Mobile"
  | "Testing"
  | "AI"
  | "Design"
  | "Tooling"
  | "Practices";

export type SkillDef = {
  name: string;
  aliases: string[];
  category: SkillCategory;
  related?: Record<string, number>;
  weight?: number;
  learn?: string;
};

export const SKILLS: SkillDef[] = [
  // Frontend core
  { name: "JavaScript", aliases: ["javascript", "js", "es6", "ecmascript", "es2015"], category: "Frontend", related: { TypeScript: 0.8 }, learn: "https://javascript.info" },
  { name: "TypeScript", aliases: ["typescript", "ts"], category: "Frontend", related: { JavaScript: 0.6 }, learn: "https://www.typescriptlang.org/docs/handbook/intro.html" },
  { name: "React", aliases: ["react", "react.js", "reactjs", "react js"], category: "Frontend", related: { "Next.js": 0.7, "React Native": 0.5, Vue: 0.35, Preact: 0.8 }, learn: "https://react.dev/learn" },
  { name: "Next.js", aliases: ["next.js", "nextjs", "next js", "app router"], category: "Frontend", related: { React: 0.6, Remix: 0.6, Nuxt: 0.3 }, learn: "https://nextjs.org/learn" },
  { name: "Vue", aliases: ["vue", "vue.js", "vuejs", "vue 3", "vue3"], category: "Frontend", related: { Nuxt: 0.6, React: 0.35, Svelte: 0.3 }, learn: "https://vuejs.org/guide/introduction.html" },
  { name: "Nuxt", aliases: ["nuxt", "nuxt.js", "nuxtjs"], category: "Frontend", related: { Vue: 0.6, "Next.js": 0.4 }, learn: "https://nuxt.com/docs/getting-started/introduction" },
  { name: "Angular", aliases: ["angular", "angularjs", "angular.js"], category: "Frontend", related: { TypeScript: 0.2, React: 0.25 }, learn: "https://angular.dev/tutorials" },
  { name: "Svelte", aliases: ["svelte", "sveltekit", "svelte kit"], category: "Frontend", related: { React: 0.3, Vue: 0.3 }, learn: "https://svelte.dev/tutorial" },
  { name: "Remix", aliases: ["remix", "remix.run", "react router 7"], category: "Frontend", related: { "Next.js": 0.6, React: 0.6 }, learn: "https://remix.run/docs" },
  { name: "Astro", aliases: ["astro", "astro.js", "astrojs"], category: "Frontend", related: { "Next.js": 0.4 }, learn: "https://docs.astro.build" },
  { name: "Preact", aliases: ["preact"], category: "Frontend", related: { React: 0.8 } },
  { name: "SolidJS", aliases: ["solidjs", "solid.js"], category: "Frontend", related: { React: 0.5 } },
  { name: "HTML", aliases: ["html", "html5", "semantic html"], category: "Frontend", weight: 0.5, learn: "https://web.dev/learn/html" },
  { name: "CSS", aliases: ["css", "css3", "flexbox", "css grid"], category: "Frontend", related: { "Tailwind CSS": 0.5, Sass: 0.6 }, weight: 0.6, learn: "https://web.dev/learn/css" },
  { name: "Tailwind CSS", aliases: ["tailwind", "tailwindcss", "tailwind css"], category: "Frontend", related: { CSS: 0.6 }, learn: "https://tailwindcss.com/docs" },
  { name: "Sass", aliases: ["sass", "scss", "less"], category: "Frontend", related: { CSS: 0.8 } },
  { name: "CSS-in-JS", aliases: ["styled-components", "styled components", "emotion.js", "css-in-js", "css modules"], category: "Frontend", related: { CSS: 0.7, "Tailwind CSS": 0.6 } },
  { name: "Component libraries", aliases: ["material ui", "material-ui", "mui", "chakra ui", "chakra", "ant design", "antd", "shadcn", "shadcn/ui", "radix", "radix ui", "headless ui", "bootstrap"], category: "Frontend", related: { "Tailwind CSS": 0.6, "Design systems": 0.5 } },
  { name: "Redux", aliases: ["redux", "redux toolkit", "rtk", "rtk query"], category: "Frontend", related: { "State management": 0.8 }, learn: "https://redux.js.org/tutorials/essentials/part-1-overview-concepts" },
  { name: "State management", aliases: ["zustand", "mobx", "recoil", "jotai", "xstate", "pinia", "state management"], category: "Frontend", related: { Redux: 0.8 }, learn: "https://zustand.docs.pmnd.rs" },
  { name: "TanStack Query", aliases: ["react query", "react-query", "tanstack query", "tanstack", "swr"], category: "Frontend", related: { Redux: 0.4 }, learn: "https://tanstack.com/query/latest/docs/framework/react/overview" },
  { name: "React Server Components", aliases: ["react server components", "server components", "rsc", "server actions"], category: "Frontend", related: { "Next.js": 0.7 }, learn: "https://react.dev/reference/rsc/server-components" },
  { name: "Web performance", aliases: ["core web vitals", "web vitals", "lighthouse", "web performance", "performance optimization", "lcp", "code splitting", "lazy loading"], category: "Frontend", learn: "https://web.dev/learn/performance" },
  { name: "Accessibility", aliases: ["accessibility", "a11y", "wcag", "aria", "screen reader", "screen readers"], category: "Frontend", learn: "https://web.dev/learn/accessibility" },
  { name: "SEO", aliases: ["seo", "search engine optimization", "structured data"], category: "Frontend", weight: 0.6 },
  { name: "Responsive design", aliases: ["responsive design", "responsive web", "mobile-first", "mobile first", "cross-browser", "cross browser"], category: "Frontend", weight: 0.6, related: { CSS: 0.6 } },
  { name: "Animation", aliases: ["framer motion", "motion.dev", "gsap", "css animations", "lottie"], category: "Frontend", weight: 0.7 },
  { name: "Three.js", aliases: ["three.js", "threejs", "react three fiber", "r3f", "webgl", "webgpu"], category: "Frontend", learn: "https://threejs.org/manual" },
  { name: "Data visualization", aliases: ["d3", "d3.js", "recharts", "chart.js", "highcharts", "echarts", "tradingview", "lightweight charts", "data visualization", "visx"], category: "Frontend", learn: "https://d3js.org/getting-started" },
  { name: "Micro-frontends", aliases: ["micro-frontends", "micro frontends", "microfrontends", "module federation"], category: "Frontend" },
  { name: "PWA", aliases: ["pwa", "progressive web app", "service worker", "service workers"], category: "Frontend", weight: 0.7 },
  { name: "Web Components", aliases: ["web components", "lit", "custom elements", "shadow dom"], category: "Frontend", weight: 0.7 },
  { name: "i18n", aliases: ["i18n", "internationalization", "localization", "l10n", "next-intl", "i18next"], category: "Frontend", weight: 0.6 },
  { name: "Electron", aliases: ["electron", "tauri"], category: "Frontend" },
  { name: "jQuery", aliases: ["jquery"], category: "Frontend", weight: 0.4, related: { JavaScript: 0.5 } },
  { name: "Forms & validation", aliases: ["react hook form", "formik", "zod", "yup"], category: "Frontend", weight: 0.5 },
  { name: "WebSockets", aliases: ["websocket", "websockets", "socket.io", "server-sent events"], category: "Backend" },

  // Web3
  { name: "Web3.js", aliases: ["web3.js", "web3js"], category: "Web3", related: { "Ethers.js": 0.8, viem: 0.6 }, learn: "https://docs.web3js.org" },
  { name: "Ethers.js", aliases: ["ethers.js", "ethersjs", "ethers"], category: "Web3", related: { "Web3.js": 0.8, viem: 0.7 }, learn: "https://docs.ethers.org" },
  { name: "viem", aliases: ["viem"], category: "Web3", related: { "Ethers.js": 0.7, wagmi: 0.6 }, learn: "https://viem.sh" },
  { name: "wagmi", aliases: ["wagmi", "rainbowkit", "web3modal", "reown", "walletconnect", "connectkit"], category: "Web3", related: { viem: 0.6, "Ethers.js": 0.5 }, learn: "https://wagmi.sh" },
  { name: "Solidity", aliases: ["solidity"], category: "Web3", related: { "Smart contracts": 0.9 }, learn: "https://docs.soliditylang.org" },
  { name: "Smart contracts", aliases: ["smart contract", "smart contracts", "erc-20", "erc20", "erc-721", "erc721", "erc-1155", "openzeppelin"], category: "Web3", related: { Solidity: 0.7 }, learn: "https://docs.openzeppelin.com/contracts" },
  { name: "Hardhat / Foundry", aliases: ["hardhat", "foundry", "truffle"], category: "Web3", related: { Solidity: 0.4 }, learn: "https://book.getfoundry.sh" },
  { name: "EVM", aliases: ["evm", "ethereum", "layer 2", "l2", "rollups", "arbitrum", "op mainnet", "polygon", "base chain", "bnb chain", "bsc"], category: "Web3", related: { "Ethers.js": 0.4, Solidity: 0.4 }, learn: "https://ethereum.org/en/developers/docs" },
  { name: "Solana", aliases: ["solana", "solana web3.js", "@solana/web3.js", "solana anchor"], category: "Web3", related: { Rust: 0.3, EVM: 0.3 }, learn: "https://solana.com/docs" },
  { name: "DeFi", aliases: ["defi", "decentralized finance", "amm", "dex", "lending protocol", "uniswap", "staking"], category: "Web3", learn: "https://ethereum.org/en/defi" },
  { name: "Wallets & signing", aliases: ["metamask", "wallet integration", "wallet connection", "eip-712", "account abstraction", "erc-4337", "siwe", "sign-in with ethereum", "safe wallet"], category: "Web3", related: { wagmi: 0.6, "Ethers.js": 0.5 } },
  { name: "The Graph", aliases: ["the graph", "subgraph", "subgraphs"], category: "Web3", related: { GraphQL: 0.5 }, learn: "https://thegraph.com/docs" },
  { name: "IPFS", aliases: ["ipfs", "arweave", "filecoin"], category: "Web3", weight: 0.6 },
  { name: "Crypto trading", aliases: ["crypto exchange", "trading platform", "order book", "orderbook", "cex", "perpetuals", "derivatives trading"], category: "Web3" },

  // Backend
  { name: "Node.js", aliases: ["node.js", "nodejs", "node js", "node"], category: "Backend", related: { "Express": 0.6, NestJS: 0.6 }, learn: "https://nodejs.org/en/learn" },
  { name: "Express", aliases: ["express.js", "expressjs", "express js", "fastify", "koa", "hono"], category: "Backend", related: { "Node.js": 0.7 } },
  { name: "NestJS", aliases: ["nestjs", "nest.js"], category: "Backend", related: { "Node.js": 0.6, Express: 0.6 }, learn: "https://docs.nestjs.com" },
  { name: "GraphQL", aliases: ["graphql", "apollo", "apollo client", "urql"], category: "Backend", related: { "REST APIs": 0.3 }, learn: "https://graphql.org/learn" },
  { name: "REST APIs", aliases: ["restful", "rest api", "rest apis", "openapi", "swagger"], category: "Backend", weight: 0.7 },
  { name: "tRPC", aliases: ["trpc"], category: "Backend", related: { "REST APIs": 0.4 } },
  { name: "Python", aliases: ["python", "python3"], category: "Backend", learn: "https://docs.python.org/3/tutorial" },
  { name: "Django", aliases: ["django", "django rest framework", "drf"], category: "Backend", related: { Python: 0.5 } },
  { name: "FastAPI", aliases: ["fastapi", "flask"], category: "Backend", related: { Python: 0.5 } },
  { name: "Go", aliases: ["golang", "go lang", "go language"], category: "Backend", learn: "https://go.dev/tour" },
  { name: "Rust", aliases: ["rust", "rustlang"], category: "Backend", learn: "https://doc.rust-lang.org/book" },
  { name: "Java", aliases: ["java", "spring boot", "spring framework", "springboot"], category: "Backend", related: { Kotlin: 0.5 } },
  { name: "Kotlin", aliases: ["kotlin"], category: "Mobile", related: { Java: 0.5 } },
  { name: "C#/.NET", aliases: ["c#", ".net", "dotnet", "asp.net", ".net core"], category: "Backend" },
  { name: "PHP", aliases: ["php", "laravel", "symfony", "wordpress"], category: "Backend" },
  { name: "Ruby", aliases: ["ruby", "ruby on rails", "rails"], category: "Backend" },
  { name: "Microservices", aliases: ["microservices", "microservice", "service-oriented", "event-driven", "distributed systems"], category: "Backend" },
  { name: "Message queues", aliases: ["kafka", "rabbitmq", "sqs", "pub/sub", "pubsub", "bullmq", "nats"], category: "Backend" },
  { name: "Auth", aliases: ["oauth", "oauth2", "openid connect", "oidc", "jwt", "auth0", "clerk", "nextauth", "auth.js", "sso", "saml"], category: "Backend", weight: 0.7 },
  { name: "Payments", aliases: ["stripe", "payment gateway", "payment gateways", "payment provider", "payments integration", "checkout.com", "adyen", "psp"], category: "Backend" },

  // Data
  { name: "SQL", aliases: ["sql"], category: "Data", related: { PostgreSQL: 0.7, MySQL: 0.7 }, weight: 0.8 },
  { name: "PostgreSQL", aliases: ["postgresql", "postgres", "psql"], category: "Data", related: { SQL: 0.8, MySQL: 0.7 }, learn: "https://www.postgresql.org/docs/current/tutorial.html" },
  { name: "MySQL", aliases: ["mysql", "mariadb"], category: "Data", related: { SQL: 0.8, PostgreSQL: 0.7 } },
  { name: "MongoDB", aliases: ["mongodb", "mongo", "mongoose"], category: "Data", learn: "https://learn.mongodb.com" },
  { name: "Redis", aliases: ["redis", "memcached", "valkey"], category: "Data", learn: "https://redis.io/learn" },
  { name: "ORMs", aliases: ["prisma", "drizzle", "typeorm", "sequelize", "knex", "sqlalchemy"], category: "Data", related: { SQL: 0.5 } },
  { name: "Firebase / Supabase", aliases: ["firebase", "firestore", "supabase", "appwrite"], category: "Data" },
  { name: "Elasticsearch", aliases: ["elasticsearch", "opensearch", "algolia", "meilisearch", "typesense"], category: "Data" },
  { name: "Data engineering", aliases: ["etl", "data pipeline", "data pipelines", "airflow", "dbt", "spark", "snowflake", "bigquery"], category: "Data" },

  // Cloud & DevOps
  { name: "AWS", aliases: ["aws", "amazon web services", "lambda", "s3", "ec2", "cloudfront", "dynamodb"], category: "Cloud & DevOps", related: { GCP: 0.5, Azure: 0.5 }, learn: "https://roadmap.sh/aws" },
  { name: "GCP", aliases: ["gcp", "google cloud", "cloud run", "firebase hosting"], category: "Cloud & DevOps", related: { AWS: 0.5, Azure: 0.5 } },
  { name: "Azure", aliases: ["azure", "microsoft azure"], category: "Cloud & DevOps", related: { AWS: 0.5, GCP: 0.5 } },
  { name: "Docker", aliases: ["docker", "containers", "containerization", "docker compose"], category: "Cloud & DevOps", learn: "https://docs.docker.com/get-started" },
  { name: "Kubernetes", aliases: ["kubernetes", "k8s", "helm", "eks", "gke"], category: "Cloud & DevOps", related: { Docker: 0.3 }, learn: "https://kubernetes.io/docs/tutorials" },
  { name: "CI/CD", aliases: ["ci/cd", "ci cd", "continuous integration", "continuous delivery", "continuous deployment", "github actions", "gitlab ci", "jenkins", "circleci"], category: "Cloud & DevOps", weight: 0.8, learn: "https://docs.github.com/en/actions" },
  { name: "Terraform", aliases: ["terraform", "infrastructure as code", "iac", "pulumi", "cloudformation", "aws cdk"], category: "Cloud & DevOps" },
  { name: "Serverless & edge", aliases: ["vercel", "netlify", "cloudflare workers", "edge functions", "serverless"], category: "Cloud & DevOps", weight: 0.7 },
  { name: "Linux", aliases: ["linux", "bash", "shell scripting", "unix"], category: "Cloud & DevOps", weight: 0.6 },
  { name: "Observability", aliases: ["observability", "monitoring", "sentry", "datadog", "grafana", "prometheus", "opentelemetry", "new relic"], category: "Cloud & DevOps", weight: 0.7 },
  { name: "Security", aliases: ["owasp", "application security", "appsec", "xss", "csrf", "penetration testing", "security best practices", "secure coding"], category: "Cloud & DevOps", learn: "https://owasp.org/www-project-top-ten" },

  // Mobile
  { name: "React Native", aliases: ["react native", "react-native", "expo"], category: "Mobile", related: { React: 0.5, Flutter: 0.3 }, learn: "https://reactnative.dev/docs/getting-started" },
  { name: "Flutter", aliases: ["flutter", "dart"], category: "Mobile", related: { "React Native": 0.3 } },
  { name: "iOS (Swift)", aliases: ["swift", "swiftui", "ios development", "objective-c"], category: "Mobile" },
  { name: "Android", aliases: ["android", "jetpack compose"], category: "Mobile", related: { Kotlin: 0.5 } },

  // Testing
  { name: "Unit testing", aliases: ["jest", "vitest", "mocha", "unit testing", "unit tests", "tdd", "test-driven"], category: "Testing", learn: "https://vitest.dev/guide" },
  { name: "Testing Library", aliases: ["testing library", "react testing library", "enzyme"], category: "Testing", related: { "Unit testing": 0.6 }, learn: "https://testing-library.com/docs" },
  { name: "E2E testing", aliases: ["cypress", "playwright", "selenium", "puppeteer", "e2e", "end-to-end testing", "end to end testing", "webdriverio"], category: "Testing", learn: "https://playwright.dev/docs/intro" },
  { name: "Storybook", aliases: ["storybook", "chromatic"], category: "Testing", related: { "Design systems": 0.4 }, learn: "https://storybook.js.org/tutorials" },

  // AI
  { name: "LLM integration", aliases: ["llm", "llms", "large language model", "openai", "anthropic", "claude", "gpt", "langchain", "llamaindex", "rag", "retrieval-augmented", "vercel ai sdk", "ai sdk", "prompt engineering", "embeddings", "vector database", "pinecone", "ai agents", "agentic", "mcp"], category: "AI", learn: "https://docs.claude.com/en/docs/get-started" },
  { name: "Machine learning", aliases: ["machine learning", "pytorch", "tensorflow", "scikit-learn", "deep learning", "computer vision", "nlp"], category: "AI", related: { Python: 0.3 } },

  // Design
  { name: "Figma", aliases: ["figma", "sketch", "adobe xd"], category: "Design", weight: 0.7 },
  { name: "Design systems", aliases: ["design system", "design systems", "component library", "ui kit", "design tokens"], category: "Design", related: { "Component libraries": 0.5, Storybook: 0.4 } },
  { name: "UI/UX", aliases: ["ui/ux", "ux", "user experience", "interaction design", "pixel-perfect", "pixel perfect"], category: "Design", weight: 0.6 },

  // Tooling
  { name: "Git", aliases: ["git", "github", "gitlab", "bitbucket", "version control"], category: "Tooling", weight: 0.3 },
  { name: "Build tools", aliases: ["webpack", "vite", "rollup", "esbuild", "turbopack", "babel", "swc", "parcel"], category: "Tooling", weight: 0.7 },
  { name: "Monorepos", aliases: ["monorepo", "monorepos", "turborepo", "nx", "lerna", "pnpm workspaces"], category: "Tooling", weight: 0.7 },
  { name: "Linting & formatting", aliases: ["eslint", "prettier", "biome"], category: "Tooling", weight: 0.3 },

  // Practices
  { name: "Agile", aliases: ["agile", "scrum", "kanban", "jira"], category: "Practices", weight: 0.3 },
  { name: "Code review & mentoring", aliases: ["code review", "code reviews", "mentoring", "mentor", "technical leadership", "tech lead"], category: "Practices", weight: 0.5 },
  { name: "System design", aliases: ["system design", "architecture", "software architecture", "scalable systems", "scalability"], category: "Practices", weight: 0.8, learn: "https://roadmap.sh/system-design" },
  { name: "Fintech", aliases: ["fintech", "banking", "financial services", "payments industry", "kyc", "aml"], category: "Practices", weight: 0.6 },
];

export const SKILL_BY_NAME = new Map(SKILLS.map((s) => [s.name.toLowerCase(), s]));

export function findSkill(name: string): SkillDef | undefined {
  const key = name.trim().toLowerCase();
  const direct = SKILL_BY_NAME.get(key);
  if (direct) return direct;
  return SKILLS.find((s) => s.aliases.includes(key));
}

/** Canonical skill name for free text ("reactjs" -> "React"), or the trimmed input if unknown. */
export function canonicalSkill(name: string): string {
  return findSkill(name)?.name ?? name.trim();
}

export const CATEGORY_ORDER: SkillCategory[] = [
  "Frontend",
  "Web3",
  "Backend",
  "Data",
  "Cloud & DevOps",
  "Testing",
  "AI",
  "Mobile",
  "Design",
  "Tooling",
  "Practices",
];
