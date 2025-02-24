# Hello

## A free, p2p, group video call app for the web. No signups. No downloads. Works in all major browsers.

Hello is built using WebRTC, so all your video, audio & text chat is peer-to-peer. Group video call is achieved using WebRTC mesh. So the quality of the call is inversely proportional to the number of people on the call. The sweet number is somewhere around 6 to 8 people in an average high-speed connection.

---

### Prerequisites:

- Node.js 8.x or above
- NPM

### How to Build this app locally

[Fork this repo](https://github.com/vasanthv/hello/fork) and then clone it:

```bash
git clone https://github.com/<your_name>/hello.git
```

`cd hello` and then install dependencies

```bash
npm install
```

Run the app

```bash
npm start
```

The app will start on https://localhost:3000. Since we're using a self-signed certificate, you'll need to:

1. Open https://localhost:3000 in your browser
2. Click "Advanced" on the security warning
3. Click "Proceed to localhost (unsafe)"

This security warning appears because we're using a self-signed certificate for development. In production, you should use a proper SSL certificate from a trusted provider.

Note: WebRTC requires HTTPS in modern browsers, which is why we use SSL even in development.

### Contributions

Please refer <a href="https://github.com/vasanthv/hello/blob/master/markdowns/CONTRIBUTIONS.md">CONTRIBUTIONS.md</a> for more info.

### LICENSE

<a href="https://github.com/vasanthv/hello/blob/master/LICENSE">MIT License</a>
