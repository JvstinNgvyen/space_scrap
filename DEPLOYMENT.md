# Railway Deployment Guide

This guide will help you deploy Space Scrap to Railway in just a few minutes!

## Prerequisites

- GitHub account
- Railway account (free) - [Sign up here](https://railway.app/)
- This repository pushed to GitHub

---

## 🚀 Quick Deploy (5 Minutes)

### Step 1: Push to GitHub

Make sure your code is on GitHub:

```bash
# If you haven't already
git remote add origin https://github.com/YOUR_USERNAME/space_scrap.git
git push -u origin main
```

### Step 2: Deploy to Railway

1. Go to [Railway.app](https://railway.app/)
2. Click **"Start a New Project"**
3. Click **"Deploy from GitHub repo"**
4. Select your **space_scrap** repository
5. Railway will automatically detect your app and start deploying!

### Step 3: Wait for Build

Railway will:
- ✅ Install dependencies (`npm install`)
- ✅ Build your frontend (`npm run build`)
- ✅ Start your server (`npm start`)

This takes about 2-3 minutes.

### Step 4: Get Your URL

Once deployed:
1. Click on your project
2. Click **"Settings"** tab
3. Scroll to **"Domains"**
4. Click **"Generate Domain"**
5. You'll get a URL like: `https://space-scrap-production.up.railway.app`

### Step 5: Test It!

Open your Railway URL and:
- Click **"multiplayer"**
- Create a room
- Open the URL in another browser/tab
- Join the room
- **Play!** 🎮

---

## 🔧 Configuration (Optional)

### Environment Variables

Railway automatically sets `PORT`, but you can add these if needed:

1. Go to your project in Railway
2. Click **"Variables"** tab
3. Add:

```
NODE_ENV=production
```

That's it! Railway handles the rest.

---

## 📝 What Railway Does Automatically

Railway detects your `railway.json` and:

1. **Build Command**: `npm install && npm run build`
   - Installs all dependencies
   - Builds Vite frontend to `dist/`

2. **Start Command**: `node server.js`
   - Runs your Socket.IO server
   - Serves built frontend from `dist/`
   - Handles WebSocket connections

3. **Port Configuration**:
   - Automatically assigns a PORT
   - Your server uses `process.env.PORT`

4. **HTTPS**:
   - Automatic SSL certificate
   - All traffic is encrypted

---

## 🐛 Troubleshooting

### Build Failed

**Check the build logs in Railway:**

Common issues:
- Missing dependencies → Make sure `package.json` is correct
- Build errors → Test `npm run build` locally first

### App Won't Start

**Check the deploy logs:**

Common issues:
- Port issues → Railway sets PORT automatically, don't hardcode it
- Missing files → Make sure you pushed all files to GitHub

### Can't Connect to Multiplayer

**Check browser console (F12):**

Common issues:
- WebSocket connection failed → Check Railway logs for errors
- CORS errors → Should not happen with current setup
- "Room not found" → Server might have restarted (rooms are in-memory)

### Rooms Disappear After Restart

This is expected! Rooms are stored in-memory. When Railway restarts your app, rooms are cleared.

**Solutions:**
- For production, add a database (Redis, PostgreSQL)
- For now, just create a new room after restarts

---

## 💰 Costs

**Railway Free Tier:**
- $5 free credits per month
- ~500 hours of runtime
- Perfect for hobby projects

**Your app usage:**
- Idle: ~$0/month (very little CPU/memory)
- With players: ~$1-2/month (small project)

**When you run out of free credits:**
- Add a credit card for $5/month minimum
- Or wait until next month

---

## 🔄 Automatic Deployments

Railway automatically deploys when you push to GitHub!

```bash
# Make changes
git add .
git commit -m "Add new feature"
git push

# Railway automatically deploys! ✨
```

Watch the deployment in Railway dashboard.

---

## 📊 Monitoring

### View Logs

1. Go to Railway dashboard
2. Click your project
3. Click **"Deployments"** tab
4. Click latest deployment
5. See real-time logs!

You'll see:
```
Server running on port 3000
Socket.IO server ready for multiplayer connections
Player connected: abc123
Room created: A3B7F2
```

### Check Metrics

1. Click **"Metrics"** tab
2. See:
   - CPU usage
   - Memory usage
   - Network traffic

---

## 🌍 Custom Domain (Optional)

Want `spacescrap.com` instead of `*.up.railway.app`?

1. Buy domain (Namecheap, Cloudflare, etc.)
2. In Railway, click **"Settings"** → **"Domains"**
3. Click **"Custom Domain"**
4. Add your domain
5. Follow Railway's DNS instructions

---

## 🔐 Security Best Practices

### Current Setup ✅

- HTTPS enabled automatically
- CORS configured properly
- WebSocket connections encrypted
- No secrets in code

### For Production

Consider adding:
- Rate limiting (prevent spam)
- Player authentication
- Room passwords
- Database for persistent rooms

---

## 📈 Scaling

If your game gets popular:

1. **Upgrade Railway Plan**
   - More CPU/memory
   - Faster performance

2. **Add Database**
   - Redis for room persistence
   - PostgreSQL for user data

3. **Add CDN**
   - Cloudflare for static assets
   - Faster worldwide

---

## 🆘 Need Help?

**Railway Issues:**
- [Railway Docs](https://docs.railway.app/)
- [Railway Discord](https://discord.gg/railway)

**App Issues:**
- Check logs in Railway dashboard
- Test locally with `npm run dev:multiplayer`
- Open browser console (F12) for errors

---

## ✅ Quick Checklist

Before deploying:
- [ ] Code pushed to GitHub
- [ ] Railway account created
- [ ] Project connected to GitHub
- [ ] Build completed successfully
- [ ] Domain generated
- [ ] Multiplayer tested

---

## 🎉 You're Live!

Your game is now deployed and accessible worldwide!

Share your Railway URL with friends and play together! 🚀

**Example URL:**
`https://space-scrap-production.up.railway.app`

---

## Next Steps

1. Share with friends
2. Get feedback
3. Add features
4. Deploy updates (automatic!)
5. Have fun! 🎮
