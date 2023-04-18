const sqlite3=require('sqlite3').verbose()
var db=new sqlite3.Database(
    '../../../SQLite/cwrl-1.db',
    sqlite3.OPEN_READWRITE,
    function(err){
        if(err){
            return console.log(err.message)
        }
        console.log('connect database successfully')
    }
)
module.exports=db