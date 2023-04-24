# 微信公众号接入GPT
## 用法

我这里server.js是用来处理公众号实时消息的，gpt_reply是用来处理H5页面消息的，具体看后面实现思路

你可以两者选其一使用，合并公众号和H5部分即可

里面含有nodejs和python两种实现消息加解密的类

nodejs中还有消息回复的类方法

```
const my_encrypt = require("./server.js")
const WxServer = new my_encrypt()
console.log(WxServer.get_nonce()) // 使用类中的get_nonce方法
WxServer.get_token() // 获取公众号的access_token
WxServer.verify(timestamp, nonce, signature) // 传入消息时间戳，nonce，签名等信息，判断消息来自于微信服务器
WxServer.get_sha1(timestamp, nonce, encrypt) // 消息加密传往服务器时获取签名
WxServer.PKCS7Encode(buff) // pkcs7填充明文，同理对应WxServer.PKCS7decode(buff)为去掉填充，其中buff是bytearray类型
WxServer.encrypt_message(response)  // 加密，传入明文，返回密文，同理对应WxServer.decrypt_message(response)返回明文
WxServer.reply_message(message, FromUserName, ToUserName, MsgType)  // 回复消息,直接返回密文
```

![image](https://bucket.pursuecode.cn/upload/2023/04/8.png)

如果想直接使用server.js，请添加appinfo等必填信息，用例位于253行

## 效果
![image](https://bucket.pursuecode.cn/upload/2023/04/7.png)
## 实现思路
请跳转至我的[博客](https://www.pursuecode.cn/archives/wei-xin-gong-zhong-hao-jie-ru-chatgpt)

