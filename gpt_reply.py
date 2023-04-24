import queue
import time

import openai
import requests
from flask import Flask, jsonify, request, Response, stream_with_context
import json

from WXciper import WXBizMsgCrypt, XMLParse
import threading
app = Flask(__name__)

def wait_message():
    while True:
        if message.qsize() == 0:
            time.sleep(1)
        else:
            now = message.get()
            if now[1] and now[1].strip("\n").strip(" ") != "":
                thread = threading.Thread(target=send_message, args=(now[0], now[1],))
                thread.start()
def send_message(openid, msg):
    # print(msg)
    openai.api_key = ""
    # print(123123)
    completion = openai.ChatCompletion.create(
                model="gpt-3.5-turbo",
                messages=[{"role": "user", "content": msg}],
                max_tokens=100
            )
    # print(completion.choices[0].message["content"])
    message = f"""<xml>
        <appid><![CDATA[{appid}]]></appid>
        <openid><![CDATA[{openid}]]></openid>
        <msg><![CDATA[{completion.choices[0].message["content"]}]]></msg>
        <channel>7</channel>
    </xml>"""
    # print(123123)
    encryp_test = WXBizMsgCrypt(TOKEN, EncodingAESKey, appid)
    ret, encrypt_xml = encryp_test.EncryptMsg(message, "1234567891")
    res = requests.post(f"https://chatbot.weixin.qq.com/openapi/sendmsg/{TOKEN}", json={
        "encrypt": encrypt_xml
    })
    # print(res.text)
def set_user_status(status, openid):
    message = f"""<xml>
        <appid><![CDATA[{appid}]]></appid>
        <openid><![CDATA[{openid}]]></openid>
        <kefustate><![CDATA[{status}]]></kefustate>
    </xml>"""
    encryp_test = WXBizMsgCrypt(TOKEN, EncodingAESKey, appid)
    ret, encrypt_xml = encryp_test.EncryptMsg(message, "1234567891")
    requests.post(f"https://chatbot.weixin.qq.com/openapi/kefustate/change/{TOKEN}", json={
        "encrypt": encrypt_xml
    })
@app.route("/openchat", methods=["POST"])
def wx_question():
    global request_id, message
    try:
        data = request.get_json()["encrypted"]
        crypt = WXBizMsgCrypt(TOKEN, EncodingAESKey, appid)
        ret, data = crypt.DecryptMsg(data)
        print(data)
        xml_parse = XMLParse().get_message(data)
        if xml_parse[4][:2] == "wx":
            return {}
        if xml_parse[2].strip("") == "0":
            if xml_parse[3] == "userEnter":
                status = "personserving"
            elif xml_parse[3] == "userQuit":
                status = "complete"
            else:
                message.put(xml_parse)
                # print(1)
                return jsonify({})
            thread = threading.Thread(target=set_user_status, args=(status, xml_parse[1],))
            thread.start()
        return jsonify({})
    except Exception as e:
        print(e)
        return jsonify({
          "err_code": -1,
          "data_list": None
        }), [("Content-Type", "application/json")]


if __name__ == "__main__":
    message = queue.Queue()
    thread = threading.Thread(target=wait_message)
    thread.start()
    request_id = ""
    TOKEN = ""
    EncodingAESKey = ""
    appid = ""
    app.run(port=5100)

