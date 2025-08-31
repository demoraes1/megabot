fetch("https://api.ipify.org?format=json")
  .then((response) => response.json())
  .then((data) => {
    const url = window.location.href;
    if (!url.startsWith("https://")) return;

    const container = document.createElement("div");
    container.style.position = "fixed";
    container.style.bottom = "10px";
    container.style.right = "10px";
    container.style.zIndex = "9999";
    container.style.pointerEvents = "none";

    const shadowRoot = container.attachShadow({ mode: "open" });

    const style = document.createElement("style");
    style.textContent = `
      div {
        background-color: rgba(0, 0, 0, 0.7);
        color: #fff;
        padding: 5px 10px;
        border-radius: 5px;
        font-family: Arial, sans-serif;
        font-size: 14px;
        pointer-events: none;
      }
    `;

    const ipBox = document.createElement("div");
    ipBox.textContent = `IP: ${data.ip}`;

    shadowRoot.appendChild(style);
    shadowRoot.appendChild(ipBox);
    document.body.appendChild(container);
  })
  .catch((error) => console.error("Erro ao obter IP:", error));
