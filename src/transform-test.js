const {transformGitHubEventData} = require('./transform')
const fs = require('fs')

function test() {
 const buffer = fs.readFileSync('src/test.json')
 const ghEvents = JSON.parse(buffer.toString())
 const result = transformGitHubEventData(ghEvents)
 console.log(result)
}

var md = require("markdown-it")({
  html: true,
  linkify: true,
  breaks: true
});
// test();
console.log(md.render("### Your current Halo version\n\n2.3.0-SNAPSHOT\n\n### Describe this feature\n\nI got the error tips below If the post was deleted.\r\n\r\n![image](https://user-images.githubusercontent.com/16865714/218047044-d93b64a2-7faa-4663-8a99-263a53057fbd.png)\r\n\r\nIt would be better if the error page displays `Post not found or deleted` when the post is deleted or not found.\n\n### Additional information\n\n/kind improvement\r\n/area core"))