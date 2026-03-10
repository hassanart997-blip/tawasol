import {io} from "socket.io-client"

const socket = io("http://localhost:5000")

socket.on("receiveMessage",(data)=>{

console.log(data)

})

socket.emit("sendMessage",{

text:"hello"

})
