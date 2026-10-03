const fs = require("fs");
for (const f of fs.readdirSync(".").filter((f) => f.endsWith(".html"))) {
  let s = fs.readFileSync(f, "utf8");
  if (s.includes("css/logo.css")) {
    console.log("sudah ada :", f);
    continue;
  }
  s = s.replace(
    "</head>",
    '    <link rel="stylesheet" href="css/logo.css" />\n  </head>',
  );
  fs.writeFileSync(f, s);
  console.log("DITAMBAH  :", f);
}