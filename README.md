<div align="center">

# SQLens

**Interactive SQL Query Visualizer for Education**

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![Next.js](https://img.shields.io/badge/Next.js-15-black)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-blue)](https://www.typescriptlang.org/)

[Live Demo](https://sqlens.vercel.app) · [Report Bug](https://github.com/sqlens/sqlens/issues) · [Request Feature](https://github.com/sqlens/sqlens/issues)

</div>

---

## Why SQLens?

Learning SQL can be challenging. Students often struggle to understand:
- How queries are actually executed
- What happens at each step of a complex query
- Why certain rows are included or excluded
- How JOINs, GROUP BY, and subqueries work internally

**SQLens solves this** by providing an interactive, visual way to explore SQL query execution. Students can:

- **See the execution plan** as a visual tree of operations
- **Step through execution** one operation at a time
- **Watch data flow** through each node with animations
- **Understand filtering** with color-coded rows (green = included, red = filtered out)
- **Learn relational algebra** with proper symbols (σ, π, ⋈, γ, etc.)

<!-- TODO: Add screenshot/GIF here -->
<!-- ![SQLens Demo](./docs/demo.gif) -->

## Features

### Schema Browser
- Pre-loaded example databases (University, E-commerce)
- Visual table cards with columns, types, and relationships
- Create custom tables or import CSV
- Export schema as SQL dump

### Query Editor
- Syntax highlighting with CodeMirror 6
- Autocomplete for tables, columns, and SQL keywords
- Student-friendly error messages with suggestions
- Query library with 30+ categorized examples

### Execution Plan Visualizer
- Parse queries into relational algebra trees
- Visual node graph with operation symbols
- Animated data flow particles
- Click nodes to see intermediate results
- Zoomable and pannable canvas

### Step-Through Mode ⭐
The killer feature for learning:
- Walk through query execution step by step
- See which rows pass each filter (green) or get excluded (red)
- Plain English explanations for each operation
- Visual grouping for GROUP BY operations
- Connecting lines for JOINs showing row matches

### Results Panel
- Final query results with row count
- Execution time display
- Error handling with helpful messages

## Tech Stack

- **Framework**: [Next.js 15](https://nextjs.org/) (Static Export)
- **Language**: [TypeScript](https://www.typescriptlang.org/) (Strict Mode)
- **Database**: [sql.js](https://sql.js.org/) (SQLite in WASM)
- **Editor**: [CodeMirror 6](https://codemirror.net/)
- **Visualization**: [React Flow](https://reactflow.dev/)
- **Animations**: [Framer Motion](https://www.framer.com/motion/)
- **Styling**: [Tailwind CSS](https://tailwindcss.com/)
- **State**: [Zustand](https://zustand-demo.pmnd.rs/)

## Quick Start

### Prerequisites
- Node.js 18+
- npm or yarn or pnpm

### Installation

```bash
# Clone the repository
git clone https://github.com/sqlens/sqlens.git
cd sqlens

# Install dependencies
npm install

# Start development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Build for Production

```bash
# Build static export
npm run build

# Preview production build
npx serve out
```

## For Professors

SQLens is designed to be used in classroom settings:

### Presentation Mode
- **Light theme** available for projectors (click the sun/moon icon)
- **Zoom controls** on the execution plan for large displays
- **Keyboard shortcuts** for smooth demonstrations

### Suggested Uses
1. **Lecture demonstrations**: Show how queries execute step by step
2. **Lab exercises**: Have students predict query results before stepping through
3. **Homework**: Assign queries and ask students to explain the execution plan
4. **Office hours**: Debug student queries visually

### Pre-loaded Examples
Each database includes 15+ example queries across categories:
- **Basic**: Simple SELECT, WHERE, ORDER BY
- **Joins**: INNER, LEFT, RIGHT, CROSS JOIN
- **Aggregation**: GROUP BY, HAVING, COUNT, SUM, AVG
- **Subqueries**: Correlated and uncorrelated
- **Advanced**: Complex multi-table queries

## Keyboard Shortcuts

| Key | Action |
|-----|--------|
| `Ctrl+Enter` | Run query |
| `Space` | Next step |
| `←` | Previous step |
| `→` | Next step |
| `P` | Play/Pause auto-step |
| `R` | Reset steps |
| `?` | Show help |

## Project Structure

```
sqlens/
├── src/
│   ├── app/           # Next.js app router
│   ├── components/    # React components
│   │   ├── SchemaPanel/
│   │   ├── Editor/
│   │   ├── ExecutionPlan/
│   │   ├── StepThrough/
│   │   ├── Results/
│   │   └── shared/
│   ├── engine/        # SQL parsing and execution
│   │   ├── database.ts
│   │   ├── parser.ts
│   │   ├── planner.ts
│   │   ├── stepper.ts
│   │   └── explainer.ts
│   ├── data/          # Example databases
│   ├── stores/        # Zustand state
│   ├── types/         # TypeScript types
│   └── utils/         # Utilities
└── public/
```

## Contributing

Contributions are welcome! Please read our contributing guidelines before submitting a PR.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Development Guidelines
- Use TypeScript strict mode
- Follow the existing code style
- Write meaningful commit messages
- Test your changes locally

## Roadmap

- [ ] Support for more SQL features (CTEs, window functions)
- [ ] Export execution plans as images
- [ ] Collaborative mode for classrooms
- [ ] Custom database file upload
- [ ] Query history with local storage
- [ ] More example databases

## Author

**Mhmd** - *Author and Programmer*

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

Copyright (c) 2024-2026 Mhmd

## Acknowledgments

- [sql.js](https://sql.js.org/) for SQLite in the browser
- [node-sql-parser](https://github.com/nicholasalx/node-sql-parser) for SQL parsing
- [React Flow](https://reactflow.dev/) for the graph visualization
- All the CS educators who inspired this project

---

<div align="center">

**Made with ❤️ by Mhmd for CS Education**

[⬆ Back to top](#sqlens)

</div>
