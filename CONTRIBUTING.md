# Contributing to Transformers Router

Thank you for your interest in contributing to Transformers Router! This document provides guidelines and information for contributors.

## 🚀 Quick Start

### Development Setup

1. **Clone the repository**
   ```bash
   git clone https://github.com/kacperpaczos/transformers-router.git
   cd transformers-router
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Use the correct Node.js version**
   ```bash
   nvm use  # Uses .nvmrc version
   ```

4. **Build the project**
   ```bash
   npm run build
   ```

### Running Tests

```bash
# Unit tests (fast)
npm run test:unit

# Integration tests (real AI models)
npm run test:integration

# All tests
npm run test:all

# Watch mode for unit tests
npm run test:watch
```

## 📝 Development Workflow

### 1. Choose an Issue

- Check [GitHub Issues](https://github.com/kacperpaczos/transformers-router/issues) for open tasks
- Look for issues labeled `good first issue` or `help wanted`

### 2. Create a Branch

```bash
git checkout -b feature/your-feature-name
# or
git checkout -b fix/issue-number-description
```

### 3. Make Changes

- Follow the existing code style
- Add tests for new functionality
- Update documentation as needed
- Ensure all tests pass

### 4. Commit Changes

```bash
git add .
git commit -m "feat: add your feature description"
```

Use conventional commit format:
- `feat:` for new features
- `fix:` for bug fixes
- `docs:` for documentation
- `test:` for tests
- `refactor:` for code refactoring

### 5. Push and Create PR

```bash
git push origin your-branch-name
```

Then create a Pull Request on GitHub.

## 🧪 Testing Strategy

Transformers Router uses a comprehensive 3-tier testing approach:

### Unit Tests (`tests/unit/`)
- Fast, isolated logic tests
- Mock external dependencies
- Run with `npm run test:unit`

### Integration Tests (`tests/integration-browser/`)
- Real AI models in browser environment
- Solves ONNX Runtime compatibility issues
- Run with `npm run test:integration`

### E2E Tests (`tests/e2e/`)
- Full user workflows with Web Workers
- Run with `npm run test:e2e`

## 📚 Code Guidelines

### TypeScript

- Use TypeScript for all new code
- Enable strict mode settings
- Avoid `any` type - use proper type definitions
- Export types from `index.ts` files

### Naming Conventions

- **Files**: PascalCase for components, camelCase for utilities
- **Functions**: camelCase
- **Classes**: PascalCase
- **Interfaces**: PascalCase with `I` prefix
- **Types**: PascalCase

### Error Handling

- Use custom error classes from `src/domain/errors/`
- Provide meaningful error messages
- Include context in error objects

### Documentation

- Add JSDoc comments for public APIs
- Update README.md for new features
- Include code examples in documentation

## 🔧 Code Quality

### Linting

```bash
npm run lint        # Check for issues
npm run lint:fix    # Auto-fix issues
```

### Formatting

```bash
npm run format      # Format code with Prettier
```

### Pre-commit Hooks

The project uses Husky for pre-commit hooks:
- ESLint checks
- Prettier formatting
- Tests run on pre-push

## 🏗️ Architecture

### Project Structure

```
src/
├── adapters/        # Framework adapters (OpenAI, LangChain)
├── app/            # Core application logic
├── core/           # Shared types and utilities
├── domain/         # Business logic and domain models
├── infra/          # Infrastructure (workers, logging, events)
├── models/         # AI model implementations
├── ui/             # React/Vue components and hooks
└── utils/          # Utility functions
```

### Key Concepts

- **AIProvider**: Main interface for AI operations
- **Models**: Individual AI model implementations
- **Adapters**: Framework compatibility layers
- **Workers**: Web Worker implementations for non-blocking AI
- **Vectorization**: Multimodal file processing

## 🚀 Feature Development

### Adding New Models

1. Create a new model class in `src/models/`
2. Implement the appropriate interface (LLMModel, TTSModel, etc.)
3. Add to `src/models/index.ts`
4. Add configuration in `src/app/AIProvider.ts`
5. Add tests in `tests/`

### Adding New Adapters

1. Create adapter in `src/adapters/`
2. Implement required interface
3. Add to `src/adapters/index.ts`
4. Add tests

### Adding UI Components

1. Add React components in `src/ui/react/`
2. Add Vue composables in `src/ui/vue/`
3. Export from `src/ui/index.ts`

## 📋 Pull Request Guidelines

### PR Template

Please include:

1. **Description**: What changes were made and why
2. **Testing**: How the changes were tested
3. **Breaking Changes**: Any breaking changes
4. **Screenshots**: UI changes (if applicable)

### Review Process

1. Automated checks (linting, tests, build)
2. Code review by maintainers
3. Approval and merge

## 📞 Getting Help

- **Issues**: [GitHub Issues](https://github.com/kacperpaczos/transformers-router/issues)
- **Discussions**: [GitHub Discussions](https://github.com/kacperpaczos/transformers-router/discussions)
- **Discord**: Join our community Discord

## 📄 License

By contributing to Transformers Router, you agree that your contributions will be licensed under the MIT License.

Thank you for contributing! 🎉