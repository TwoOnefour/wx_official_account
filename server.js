const express  = require('express');
const http = require("http");
const app = express();
const crypto = require("crypto")
const https = require("https")
const waitUntil = require("wait-until")
const parseString = require('xml2js').parseString;
const buffer = require("Buffer")
const sd = require('silly-datetime');
const format = require('string-format');


class WxServer{
    constructor(appinfo) {
        this.appinfo = appinfo // Initialise appinfo
    }

    get_token(){
        var options = {
            host: 'api.weixin.qq.com',
            port: 443,
            path: '/cgi-bin/token?grant_type=client_credential&appid=' + this.appinfo.appid + '&secret=' + this.appinfo.secret,
            method: 'GET',
        }
        var req = https.request(options, (res)=>{
            let data = '';
            res.on('data', function(chunk){
                data += chunk;
            });
            res.on("end", ()=>{
                data = JSON.parse(data.toString(""));
                if(data["errcode"]){
                    console.log(data["errmsg"])
                    return
                }
                // console.log(data);
                const now_time = sd.format(new Date(), 'YYYY-MM-DD HH:mm:ss');
                console.log(now_time + "\t更新access_token：" + data["access_token"])
                this.appinfo["access_token"] = data["access_token"];
            })
        })
        req.end()
    }

    verify(timestamp, nonce, signature){
        var my_array = [this.appinfo.token, timestamp, nonce];
        my_array.sort();
        var string1 = my_array.join("");
            // console.log(string1)
        let shasum = crypto.createHash('sha1')
        let generatedSignature = shasum.update(string1).digest('hex')
        // console.log(generatedSignature)
        return generatedSignature === signature;
    }

    get_sha1(timestamp, nonce, encrypt){
        var my_array = [this.appinfo.token, timestamp, nonce, encrypt];
        my_array.sort();
        var string1 = my_array.join("");
        let shasum = crypto.createHash('sha1')
        return shasum.update(string1).digest('hex');
    }

    PKCS7Decode(buff){
        let padContent = buff.charCodeAt(buff.length - 1)
            if(padContent<1 || padContent >32){
                    padContent = 0
            }
        let padLen = padContent;//根据填充规则，填充长度 = 填充内容，这一步赋值可以省略
        // console.log(padContent)
        // console.log(buff.slice(0, buff.length - padLen))
        return buff.slice(0, buff.length - padLen)
    }

    PKCS7Encode(buff){
        let blockSize = 32;
        let needPadLen = 32 - buff.length % 32
        if( needPadLen === 0) {
          needPadLen = blockSize
        }
        // console.log(needPadLen)
        let pad = Buffer.alloc(needPadLen, String.fromCharCode(needPadLen))
        // console.log(pad)
        return Buffer.concat([buff, pad])
    }

    flash_token(){
        waitUntil()
        .condition(()=>{
            this.get_token()
            return false
        })
        .interval(7100000)
        .times(Infinity)
        .done(function(){})
    }

    run_server(){
        app.get("/token", (req, res)=>{
            res.end(this.appinfo.access_token)
        })
        app.get('/api', (req, res)=>{
            var post = '';
            req.on('data', function(chunk){
                post += chunk;
            })
            res.writeHead(200, {
                'content-type': 'text/html;charset=utf8'
            })
            req.on('end', ()=> {
                if (req.query === {}){
                    res.end('请求参数不正确');
                    return;
                }

                if(this.verify(req.query["timestamp"], req.query["nonce"], req.query['signature'])){
                    // console.log("成功验证");
                    res.end(req.query["echostr"]);
                }
                else
                    res.end("假情报噢")
            })
        // res.end(message);
        });

        app.post('/api', (req, res)=>{
            var post = '';
            if(this.verify(req.query["timestamp"], req.query["nonce"], req.query['signature'])) {
                // console.log("成功验证");

                req.on('data', function (chunk) {
                    post += chunk;
                })
                res.writeHead(200, {
                    'content-type': 'text/html;charset=utf8'
                })
                req.on('end', ()=> {
                    // console.log("接受到消息：\n" + post)
                    let ToUserName = ""
                    let FromUserName = ""
                    let content = ""
                    let message = ""
                    let decript = ""
                    let response = ""
                    let MsgType = ""
                    parseString(post, (err, result) => {
                        ToUserName = result["xml"]["ToUserName"]
                        message = buffer.from(result["xml"]["Encrypt"].toString(), "base64")
                        decript = this.decrypt_message(message)
                        if(decript === -1)
                            res.end("Hacker!")
                        decript = decript.slice(20, -18)
                        parseString(decript, (err, result)=>{
                            FromUserName = result["xml"]["FromUserName"]
                            content = result["xml"]["Content"]
                            MsgType = result["xml"]["MsgType"]
                            const now_time = sd.format(new Date(), 'YYYY-MM-DD HH:mm:ss');
//                            console.log(result)
                            const str1 = format("{0}\t收到消息\ttype:{1}\tuser:{2}\tcontent:{3}", now_time, MsgType, FromUserName, content)
                            console.log(str1)
                            // 写一个发送消息接口和加密接口
                            if (MsgType.toString() === "event")
                                return
                            if (content.toString().match("订阅")){
                                let my_message = "https://www.pursuecode.cn/subscribe"
                                response = this.reply_message(my_message, ToUserName, FromUserName, "text")
                                return
                            } // 写一些关键词回复
                            else if (content.toString().match("聊天")){
                                let my_message = format("https://chatbot.weixin.qq.com/webapp/auth/gtqFsFUVcQlZBAKWywZOVXH95jW0xg?openid={}&nickname=&avatar=&robotName=GPT", FromUserName)
                                response = this.reply_message(my_message, ToUserName, FromUserName, "text")
                                return
                            }
                            else{
                                let my_message = format("你好，目前只有一种功能，输入“聊天”，可返回机器人聊天链接", FromUserName)
                                response = this.reply_message(my_message, ToUserName, FromUserName, "text")

                            }
                            // response = this.reply_message("你好", ToUserName, FromUserName, "text")
                        })
                    });
                    // res.send(response)
                    res.end(response)
                })
            }
            else{
                res.end("假情报噢")
            }
        });
        http.createServer(app).listen(54700);
    }

    get_nonce(){
        return Math.random().toString().slice(2)
    }

    encrypt_message(response){  // 加密消息
        let random16 = crypto.randomBytes(16);
        let msg = Buffer.from(response);
        let msgLength = Buffer.alloc(4);
        let corpId = Buffer.from(this.appinfo.appid)
        let tmp = ""
        msgLength.writeUInt32BE(msg.length, 0);
        response = Buffer.concat([random16, msgLength, msg ,corpId])
        let key = buffer.from(this.appinfo.EncodingAESKey + "=", "base64")
        let cipher = crypto.createCipheriv('aes-256-cbc', key, key.slice(0, 16));
        cipher.setAutoPadding(false)
        response = this.PKCS7Encode(response)
        tmp += cipher.update(response,"binary", "base64")
        tmp += cipher.final("base64")
        response = tmp
        // sha1.getSHA1(this.token, timestamp, sNonce, encrypt)
        // response = format("<xml>         <Encrypt><![CDATA[{}]]></Encrypt>         <MsgSignature><![CDATA[{}]]></MsgSignature>         <TimeStamp>{}</TimeStamp>         <Nonce><![CDATA[{}]]></Nonce>         </xml>", response, signature, tmp_xml_obj.CreateTime, nonce)
        return response
    }

    reply_message(message, FromUserName, ToUserName, MsgType){ // 被动回复消息
        let tmp_xml_obj = {
            "ToUserName": ToUserName,
            "FromUserName": FromUserName,
            "CreateTime": Math.floor(Date.now() / 1000),
            "MsgType": MsgType,
            "Content": message
        }
        let response = format("<xml>   <ToUserName><![CDATA[{0}]]></ToUserName>   <FromUserName><![CDATA[{1}]]></FromUserName>   <CreateTime>{2}</CreateTime>   <MsgType><![CDATA[{3}]]></MsgType>   <Content><![CDATA[{4}]]></Content> </xml>", tmp_xml_obj.ToUserName, tmp_xml_obj.FromUserName, tmp_xml_obj.CreateTime, tmp_xml_obj.MsgType, tmp_xml_obj.Content)
        let enc_msg = this.encrypt_message(response)
        let nonce = this.get_nonce(); // todo:random nonce finish at 2023-4-22 15:09:03
        let signature = this.get_sha1(tmp_xml_obj.CreateTime, nonce, enc_msg)
        let message_after_encrypt = format("<xml>         <Encrypt><![CDATA[{}]]></Encrypt>         <MsgSignature><![CDATA[{}]]></MsgSignature>         <TimeStamp>{}</TimeStamp>         <Nonce><![CDATA[{}]]></Nonce>         </xml>", enc_msg, signature, tmp_xml_obj.CreateTime, nonce)
        // console.log(message_after_encrypt)
        return message_after_encrypt
    }

    decrypt_message(message){ // 解密消息
        let decript = ""
        let key = buffer.from(this.appinfo.EncodingAESKey + "=", "base64")
        let decipher = crypto.createDecipheriv('aes-256-cbc', key, key.slice(0, 16));
        decipher.setAutoPadding(false);
        decript += decipher.update(message, "base64")
        decript += decipher.final()
        decript = this.PKCS7Decode(decript)
        if(this.appinfo.appid === decript.slice(-18))
            return decript
        return -1
    }

    run(){
        this.get_token()
        this.flash_token()
        this.run_server()
    }
}

appinfo = {
    "appid": "", // your appid
    "secret": "",  // your app secret
    "access_token": "", // gain from api
    "EncodingAESKey": "",  // your encoding aes key
    "token": ""  // your token
}

let wx_server = new WxServer(appinfo)
wx_server.run()

