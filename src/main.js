// Athena Examination Application Entry Point
document.addEventListener('DOMContentLoaded', () => {
  const app = document.getElementById('app');
  if (!app) return;

  app.innerHTML = `
    <main class="athena-container">
      <header class="athena-header">
        <h1 class="athena-title">Athena</h1>
        <p class="athena-tagline">Preparing examination environment...</p>
      </header>
    </main>
  `;
});
