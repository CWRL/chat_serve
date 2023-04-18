const Joi=require('joi')
const username=Joi.string().min(1).max(10).required().error(new Error('用户名格式有问题'))
const password=Joi.string().min(8).max(12).required().error(new Error('密码格式有问题'))
module.exports={
    username,
    password
}