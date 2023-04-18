const db = require('../db/index')
const bcrypt = require('bcrypt')
const schema = require('../shcema')
const Joi = require('joi')
const jwt=require('jsonwebtoken')
const fs=require('fs')
const config=require('../config.json')
const path = require('path')
const login_hander = (req, res) => {
    const validatelogin = Joi.object({ username: schema.username, password: schema.password })
    const validatelogin_result = validatelogin.validate({ username: req.body.username, password: req.body.password })
    if (validatelogin_result.error) {
        return res.send({
            status: 0,
            data: validatelogin_result.error.message
        })
    }
    const mysql='SELECT * FROM user WHERE user.username=?'
    db.all(mysql,[req.body.username],(err,rows)=>{
        if(err){
            return res.send({
                status:0,
                data:err.message
            })
        }
        if(rows.length===0){
            return res.send({
                status:0,
                data:'不存在该用户'
            })
        }
        const login_result=bcrypt.compareSync(req.body.password,rows[0].password)
        if(login_result){
            const token=jwt.sign({username:rows[0].username},config.secret,{expiresIn:"10h" })
            res.send({
                status:1,
                data:{
                    message:'登录成功',
                    data:'Bearer '+token
                }
            })
        }
    })
}
const reg_hander = (req, res) => {
    const validatelogin = Joi.object({ username: schema.username, password: schema.password })
    const validatelogin_result = validatelogin.validate({ username: req.body.username, password: req.body.password })
    if (validatelogin_result.error) {
        return res.send({
            status: 0,
            data: validatelogin_result.error.message
        })
    }
    const mysql = 'SELECT * FROM user WHERE user.username=?'
    db.all(mysql, [req.body.username], (err, rows) => {
        if (err) {
            return res.send({
                status: 0,
                data: 1
            })
        }
        if (rows.length !== 0) {
            return res.send({
                status: 0,
                data: '用户已存在'
            })
        }
        const password = bcrypt.hashSync(req.body.password, 10)
        const mysql = 'INSERT INTO user(username,password) VALUES(?,?)'
        db.run(mysql, [req.body.username, password], (err) => {
            if (err) {
                return res.send({
                    status: 0,
                    data: err.message
                })
            }
            res.send({
                status: 1,
                data: '注册成功'
            })
        })
    })
}
const sendmessage_hander=(req,res)=>{
    fs.renameSync(req.file.path,req.file.destination+'\\'+req.file.filename+'.'+req.file.mimetype.split('/')[1])
    console.log(req.file)
}
const download_files_hander=(req,res)=>{
    let {file_name,file_type} =req.body
    
    fs.access(path.join(__dirname,'/..','/image_save',`/${file_name.replace('http://192.168.10.2:5566/imageSave/','')}`),(err)=>{
        if(err){
            console.log(err.message)
            res.send({
                status:0,
                data:err.message
            })
            return
        }
        // res.download(path.join(__dirname,'/..','/image_save',`/${file_name.replace('http://192.168.10.2:5566/imageSave/','')}`))
        let vs=fs.createReadStream(path.join(__dirname,'/..','/image_save',`/${file_name.replace('http://192.168.10.2:5566/imageSave/','')}`))
        res.writeHead(200,{
            "Content-Type": "application/octet-stream",
            "Content-Disposition": `attachment;filename=${encodeURI(file_name.replace('http://192.168.10.2:5566/imageSave/',''))}`,
            'Cookie':{type:file_type},
            'name':file_type
        })
        console.log(`${file_name.replace('http://192.168.10.2:5566/imageSave/','')}`)
        vs.pipe(res)
    })
}
module.exports = {
    login_hander,
    reg_hander,
    sendmessage_hander,
    download_files_hander
}