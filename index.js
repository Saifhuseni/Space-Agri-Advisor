 const express=require('express');
 const app=express();
 const PORT=8000;
 app.listen(
    PORT,
    ()=>console.log(`its  live on ${PORT}`)
 )

app.get('/',(req,res)=>res.send("hello world"))
 
// fetch('https://reqres.in/api/users',)


// .then(res=>{
    
//     // if(res.ok){
//     //     console.log("Success");
//     // }
//     // else
//     // console.log("ERROR");
//     return res.json();
// })
// .then(data=>console.log(data))
// .catch(error=>console.log("ERROR"))