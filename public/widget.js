(function() {
  // Get configuration
  const script = document.currentScript;
  const agentId = script.getAttribute('data-agent-id');

  if (!agentId) {
    console.error('VoiceBot: Missing data-agent-id attribute');
    return;
  }

  // Get the base URL from the script src
  const scriptSrc = script.src;
  const baseUrl = scriptSrc.substring(0, scriptSrc.lastIndexOf('/'));

  // Create iframe container
  const container = document.createElement('div');
  container.id = 'voicebot-widget-container';
  container.style.cssText = `
    position: fixed;
    bottom: 20px;
    right: 20px;
    z-index: 999999;
    width: 60px;
    height: 60px;
    transition: all 0.3s ease;
  `;

  // Create toggle button
  const button = document.createElement('button');
  button.id = 'voicebot-toggle-btn';
  button.innerHTML = `
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
    </svg>
  `;
  button.style.cssText = `
    width: 60px;
    height: 60px;
    border-radius: 50%;
    border: none;
    background: #2563eb;
    color: white;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    transition: transform 0.2s ease, box-shadow 0.2s ease;
  `;
  button.onmouseover = () => {
    button.style.transform = 'scale(1.1)';
    button.style.boxShadow = '0 6px 16px rgba(0, 0, 0, 0.2)';
  };
  button.onmouseout = () => {
    button.style.transform = 'scale(1)';
    button.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.15)';
  };

  // Create iframe
  const iframe = document.createElement('iframe');
  iframe.id = 'voicebot-iframe';
  iframe.src = `${baseUrl}/widget/${agentId}`;
  iframe.style.cssText = `
    border: none;
    width: 380px;
    height: 600px;
    border-radius: 16px;
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.15);
    display: none;
    position: absolute;
    bottom: 80px;
    right: 0;
  `;

  let isOpen = false;

  button.onclick = () => {
    isOpen = !isOpen;
    if (isOpen) {
      iframe.style.display = 'block';
      button.innerHTML = `
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <line x1="18" y1="6" x2="6" y2="18"></line>
          <line x1="6" y1="6" x2="18" y2="18"></line>
        </svg>
      `;
    } else {
      iframe.style.display = 'none';
      button.innerHTML = `
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
        </svg>
      `;
    }
  };

  // Responsive handling
  const handleResize = () => {
    if (window.innerWidth < 480) {
      iframe.style.width = '100%';
      iframe.style.height = '100%';
      iframe.style.bottom = '0';
      iframe.style.right = '0';
      iframe.style.borderRadius = '0';
      container.style.width = isOpen ? '100%' : '60px';
      container.style.height = isOpen ? '100%' : '60px';
      container.style.bottom = isOpen ? '0' : '20px';
      container.style.right = isOpen ? '0' : '20px';
    } else {
      iframe.style.width = '380px';
      iframe.style.height = '600px';
      iframe.style.bottom = '80px';
      iframe.style.right = '0';
      iframe.style.borderRadius = '16px';
      container.style.width = '60px';
      container.style.height = '60px';
      container.style.bottom = '20px';
      container.style.right = '20px';
    }
  };

  window.addEventListener('resize', handleResize);

  // Append elements
  container.appendChild(iframe);
  container.appendChild(button);
  document.body.appendChild(container);
})();
