const fs = require("fs")
const http = require("http")
const url = require("url")


function callHandler(fNameStr,type,id,response){
    console.log("calling: "+id)
    fs.readFile(fNameStr, function (err, res){
        if (err) throw err
        response.writeHeader(200, {"Content-Type": type})
        response.write(res)
        response.end()
    })
}

function readIndex(response){
    callHandler("./src/front/index.html","text/html","readIndex",response)
}

function readFavicon(response){
    callHandler("./img/favicon.ico","image/ico","readFavicon",response)
}

function readCSS(response){
    callHandler("./src/front/style.css","text/css","readCSS",response)
}

function readJSTest(response){
    callHandler("./src/front/callFrontTest.js","text/javascript","readJSTest",response)
}

const handle = {
    "/": readIndex,
    "/style.css": readCSS,
    "/favicon.png": readFavicon,
    "/doTest.js": readJSTest
}

function route(handle, pathname, response){
    if(typeof handle[pathname] === 'function'){
        handle[pathname](response)
    } 
    else{
        console.log(pathname + " not found")
        response.writeHead(404, {"Content-Type": "text/plain"})
        response.write("404 Not found")
        response.end()
    }
}

function start(route, handle){
    function onRequest(request, response) {
        route(handle, url.parse(request.url).pathname, response)
    }
    http.createServer(onRequest).listen(8080)
    console.log("Server running.")
}

start(route, handle)