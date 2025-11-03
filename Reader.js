function Reader() {}

Reader.prototype = {
  load: function () {
    var jsCode = document.createElement("script");
    jsCode.setAttribute(
      "src",
      "https://cdn.jsdelivr.net/gh/tbarthen/readability@1.0.0/Readability.min.js"
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
      cleanStyle.setAttribute(
        "href",
        "https://cdn.jsdelivr.net/gh/tbarthen/readability@1.0.0/css/clean.css"
      );
      cleanStyle.setAttribute("rel", "stylesheet");
      document.head.appendChild(cleanStyle);
    };
    jsCode.onload = cleanHtml;
    document.body.appendChild(jsCode);
  },
};

if (typeof module === "object") {
  module.exports = Reader;
}
