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

![image](https://user-images.githubusercontent.com/77989499/233984982-1a80b45c-da06-4918-be8b-95073d1bd5c3.png)

如果想直接使用server.js，请添加appinfo等必填信息，用例位于253行


## 实现思路

微信公众号给的api是真的很答辩，一开始想通过被动回复来实现，但是被动回复只有5秒钟的时间，5秒不回复，公众号就会返回错误


让gpt在五秒钟时间返回答案有点过于勉强了

于是考虑使用微信自带的机器人

![image](https://user-images.githubusercontent.com/77989499/233979944-acf82a6b-dc53-40b7-9b69-de522c150df9.png)

但是这里也有个坑，和上面一样，如果长时间不返回答案的话，微信服务器就会尝试重发请求，导致不能正常实现逻辑

![image](https://user-images.githubusercontent.com/77989499/233980254-9a36ea3d-a105-43e0-9200-007db0a2283d.png)

于是改用了另外一种方式，全程调用机器人的客服api来对接

![image](https://user-images.githubusercontent.com/77989499/233980607-0ec2d626-7798-4354-952c-0aa240eaf419.png)

这里还是有个坑

![image](https://user-images.githubusercontent.com/77989499/233980674-171cb9ae-aaf9-47d0-a777-b0b30aac9dc5.png)

要认证才可以直接在微信里回复消息，认证需要300元人民币

于是只好走h5跳转网页的形式

先需要通过h5的相关回调接口获得用户的openid和相应消息

![image](https://user-images.githubusercontent.com/77989499/233980989-ff8e472d-9f76-4e96-869a-299bdf00bee2.png)

在用户输入“聊天”的时候，通过event消息事件获得openid和消息，拼接后被动回复，返回H5机器人的地址

![image](https://user-images.githubusercontent.com/77989499/233978878-f424b192-5ab5-4d0e-9de1-a39bbde99709.png)

获得openid和消息以后，后端处理请求，将问题发送到gpt api，得到结果返回，使用h5的渠道发送客服消息

至此逻辑实现

![image](https://user-images.githubusercontent.com/77989499/233981678-33309424-6931-4973-83c0-a61194e81bbf.png)


