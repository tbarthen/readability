function Reader() {}

Reader.prototype = {
  load: function () {
    var jsCode = document.createElement("script");
    // Using @master for latest. For stability, replace 'master' with a commit SHA
    // Example: "https://cdn.jsdelivr.net/gh/tbarthen/readability@3cbd689/Readability.min.js"
    jsCode.setAttribute(
      "src",
      "https://cdn.jsdelivr.net/gh/tbarthen/readability@master/Readability.min.js"
    );
    window.cleanHtml = function () {
      var loc = document.location;
      var uri = {
        spec: loc.href,
        host: loc.host,
        prePath: loc.protocol + "//" + loc.host,
        scheme: loc.protocol.substr(0, loc.protocol.indexOf(":")),
        pathBase:
          loc.protocol +
          "//" +
          loc.host +
          loc.pathname.substr(0, loc.pathname.lastIndexOf("/") + 1),
      };
      var article = new Readability(uri, document).parse();
      document.children[0].innerHTML = article.content;

      var articleTitle = document.createElement("h1");
      articleTitle.classList.add("articleTitle");
      articleTitle.appendChild(document.createTextNode(article.title));
      document.querySelector("body").prepend(articleTitle);

      var cleanStyle = document.createElement("link");
      // Using @master for latest. For stability, replace 'master' with a commit SHA
      cleanStyle.setAttribute(
        "href",
        "https://cdn.jsdelivr.net/gh/tbarthen/readability@master/css/clean.css"
      );
      cleanStyle.setAttribute("rel", "stylesheet");
      document.head.appendChild(cleanStyle);

      // Setup collapsible captions
      var captions = document.querySelectorAll(".caption");
      captions.forEach(function (caption) {
        var originalText = caption.textContent;
        if (originalText.trim().length > 0) {
          caption.innerHTML = "";
          var toggle = document.createElement("span");
          toggle.classList.add("caption-toggle");
          toggle.textContent = "[+]";
          var content = document.createElement("span");
          content.classList.add("caption-content");
          content.textContent = originalText;
          toggle.addEventListener("click", function () {
            if (content.classList.contains("expanded")) {
              content.classList.remove("expanded");
              toggle.textContent = "[+]";
            } else {
              content.classList.add("expanded");
              toggle.textContent = "[\u2212]";
            }
          });
          caption.appendChild(toggle);
          caption.appendChild(content);
        }
      });
    };
    jsCode.onload = cleanHtml;
    document.body.appendChild(jsCode);
  },
};

if (typeof module === "object") {
  module.exports = Reader;
}
