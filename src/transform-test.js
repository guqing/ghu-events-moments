const {transformGitHubEventData} = require('./transform')
const fs = require('fs')

function test() {
 const buffer = fs.readFileSync('src/test.json')
 const ghEvents = JSON.parse(buffer.toString())
 const result = transformGitHubEventData(ghEvents)
 console.log(result)
}
test();