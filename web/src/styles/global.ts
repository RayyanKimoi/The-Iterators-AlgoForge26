export const globalStyles = `
  * {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
  }

  body {
    font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    min-height: 100vh;
  }

  #root {
    min-height: 100vh;
  }

  .app-layout a {
    text-decoration: none;
  }

  .app-layout a:hover {
    text-decoration: underline;
  }

  button {
    font-family: inherit;
    cursor: pointer;
  }

  input, textarea, select {
    font-family: inherit;
  }

  ::-webkit-scrollbar {
    width: 6px;
    height: 6px;
  }

  ::-webkit-scrollbar-track {
    background: transparent;
  }

  ::-webkit-scrollbar-thumb {
    background: #D4D4D4;
    border-radius: 3px;
  }

  ::-webkit-scrollbar-thumb:hover {
    background: #A3A3A3;
  }

  /* Dark mode scrollbar */
  .app-layout.dark ::-webkit-scrollbar-thumb {
    background: #333;
  }
  .app-layout.dark ::-webkit-scrollbar-thumb:hover {
    background: #555;
  }

  input:-webkit-autofill,
  input:-webkit-autofill:hover,
  input:-webkit-autofill:focus,
  input:-webkit-autofill:active {
    -webkit-background-clip: text;
    transition: background-color 5000s ease-in-out 0s;
  }

  .app-layout:not(.dark) input:-webkit-autofill {
    -webkit-text-fill-color: #000 !important;
    box-shadow: inset 0 0 20px 20px #fff;
  }

  .app-layout.dark input:-webkit-autofill {
    -webkit-text-fill-color: #F0F0F0 !important;
    box-shadow: inset 0 0 20px 20px #141414;
  }

  .input-wrapper:focus-within {
    border-color: #000 !important;
  }

  .app-layout.dark .input-wrapper:focus-within {
    border-color: #fff !important;
  }

  input::placeholder {
    color: #A3A3A3;
    opacity: 0.8;
  }

  input:focus::placeholder {
    opacity: 0.5;
  }

  /* Grid background for app layout */
  .app-layout main {
    background-image:
      linear-gradient(rgba(0, 0, 0, 0.04) 1px, transparent 1px),
      linear-gradient(90deg, rgba(0, 0, 0, 0.04) 1px, transparent 1px);
    background-size: 50px 50px;
  }

  .app-layout.dark main {
    background-image:
      linear-gradient(rgba(255, 255, 255, 0.03) 1px, transparent 1px),
      linear-gradient(90deg, rgba(255, 255, 255, 0.03) 1px, transparent 1px);
    background-size: 50px 50px;
  }
`
