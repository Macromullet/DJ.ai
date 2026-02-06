# Contributing to DJ.ai

Thank you for your interest in contributing to DJ.ai! This document provides guidelines and instructions for contributing.

## Code of Conduct

- Be respectful and constructive
- Focus on what is best for the community
- Show empathy towards other community members

## How to Contribute

### Reporting Bugs

1. Check if the bug has already been reported in [Issues](https://github.com/Macromullet/DJ.ai/issues)
2. If not, create a new issue with:
   - Clear title and description
   - Steps to reproduce
   - Expected vs actual behavior
   - Screenshots if applicable
   - Environment details (OS, Node version, etc.)

### Suggesting Enhancements

1. Check if the enhancement has already been suggested
2. Create a new issue with:
   - Clear title and description
   - Use case and benefits
   - Possible implementation approach

### Pull Requests

1. **Fork the repository**
   ```bash
   git clone https://github.com/YOUR_USERNAME/DJ.ai.git
   cd DJ.ai
   ```

2. **Create a feature branch**
   ```bash
   git checkout -b feature/amazing-feature
   ```

3. **Set up development environment**
   ```bash
   # Follow DEV_SETUP.md for complete setup
   .\setup.ps1 --local              # Configure OAuth secrets
   dotnet run --project DJai.AppHost # Start all services via Aspire
   ```

4. **Make your changes**
   - Write clean, readable code
   - Follow existing code style
   - Add comments for complex logic
   - Update documentation if needed

5. **Test your changes**
   - Test manually in the app
   - Ensure no regressions
   - Test OAuth flows if modified

6. **Commit your changes**
   ```bash
   git add .
   git commit -m "feat: Add amazing feature"
   ```

   **Commit message format:**
   - `feat:` New feature
   - `fix:` Bug fix
   - `docs:` Documentation changes
   - `refactor:` Code refactoring
   - `test:` Adding tests
   - `chore:` Maintenance tasks

7. **Push to your fork**
   ```bash
   git push origin feature/amazing-feature
   ```

8. **Create a Pull Request**
   - Go to the original repository
   - Click "New Pull Request"
   - Select your branch
   - Fill in the PR template
   - Request review

## Development Guidelines

### Code Style

**TypeScript/React:**
- Use functional components with hooks
- Use TypeScript for type safety
- Use meaningful variable names
- Keep components small and focused
- Extract reusable logic into hooks

**C#/.NET:**
- Follow C# naming conventions
- Use async/await for async operations
- Handle errors gracefully
- Document public APIs

### Project Structure

```
electron-app/src/
├── components/        # React components
├── providers/         # Music provider implementations
├── services/          # AI, TTS, etc.
├── types/             # TypeScript interfaces
└── config/            # Configuration

oauth-proxy/
├── Functions/         # Azure Function endpoints
├── Services/          # Business logic
├── Models/            # DTOs
└── Program.cs         # DI setup
```

### Adding a New Music Provider

1. **Create provider class**
   - Implement `IMusicProvider` interface
   - Add to `electron-app/src/providers/`

2. **Add OAuth endpoints** (if needed)
   - Create Functions class in `oauth-proxy/Functions/`
   - Add initiate, exchange, refresh endpoints

3. **Update UI**
   - Add provider option in `Settings.tsx`
   - Add connection handling in `App.tsx`

4. **Document**
   - Update `docs/ARCHITECTURE.md`
   - Add provider-specific setup docs

### Testing

Currently, testing is manual. Future PRs for automated testing are welcome!

**Manual testing checklist:**
- [ ] OAuth flow works
- [ ] Search returns results
- [ ] Playback works
- [ ] Settings save/load correctly
- [ ] No console errors
- [ ] Works on Windows/Mac/Linux

## Areas That Need Help

### High Priority
- [ ] Unit tests (Jest for React, xUnit for .NET)
- [ ] E2E tests (Playwright — framework configured, needs test cases)
- [ ] GPU-accelerated visualizations (THREE.js/WebGL)

### Medium Priority
- [ ] Playlist management and persistence
- [ ] Better error handling and user feedback
- [ ] Desktop notifications
- [ ] System tray integration

### Low Priority
- [ ] Keyboard shortcuts
- [ ] Custom themes (light mode)
- [ ] Auto-update improvements

## Documentation

When adding features, please update:
- **README.md** - If user-facing
- **docs/ARCHITECTURE.md** - If architectural
- **docs/DEPLOYMENT.md** - If deployment-related
- **Code comments** - For complex logic

## Questions?

- Open a [Discussion](https://github.com/Macromullet/DJ.ai/discussions)
- Check existing [Issues](https://github.com/Macromullet/DJ.ai/issues)

## License

By contributing, you agree that your contributions will be licensed under the MIT License.

Thank you for contributing! 🎉
