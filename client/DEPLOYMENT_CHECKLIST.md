# Deployment Checklist

## Pre-Deployment

### 1. Contract Deployment
- [ ] Smart contract code is complete and tested
- [ ] Contract deployed to Sui testnet
- [ ] Package ID obtained and saved
- [ ] Contract functions verified on Sui Explorer
- [ ] Test transactions executed successfully

### 2. Frontend Configuration
- [ ] Update `src/config/game.ts` with correct `GAME_PACKAGE_ID`
- [ ] Verify `TIER_ENTRY_FEES` match contract values
- [ ] Check RPC endpoint in `src/main.tsx` (testnet/mainnet)
- [ ] Environment variables set (if any)

### 3. Integration
- [ ] Choose integration method (Quick or Manual)
- [ ] If Quick: `cp src/App.INTEGRATED.tsx src/App.tsx`
- [ ] If Manual: Follow `STEP_BY_STEP_INTEGRATION.md`
- [ ] All TypeScript errors resolved
- [ ] No console errors in development

### 4. Testing

#### Wallet Connection
- [ ] Can connect Sui Wallet
- [ ] Can connect Suiet Wallet
- [ ] Can connect Ethos Wallet
- [ ] Wallet address displays correctly
- [ ] Can disconnect wallet

#### Game Creation
- [ ] Can select tier
- [ ] Transaction modal appears
- [ ] Can sign transaction
- [ ] Transaction confirms successfully
- [ ] Navigates to lobby automatically
- [ ] Game ID is set correctly

#### Lobby Phase
- [ ] Player count displays
- [ ] Player count updates (polling works)
- [ ] Progress bar updates
- [ ] Can leave lobby
- [ ] Auto-starts when min players reached
- [ ] Transitions to active phase

#### Active Game - Questioner
- [ ] Questioner badge shows
- [ ] Can enter question text
- [ ] Can enter all 3 options
- [ ] Can select own answer
- [ ] Submit button enables when form complete
- [ ] Transaction confirms
- [ ] Question appears for all players

#### Active Game - Player
- [ ] Waits for question (loading state)
- [ ] Question appears when submitted
- [ ] Can select answer
- [ ] Can lock in answer
- [ ] Transaction confirms
- [ ] Answer count updates
- [ ] Voting stats appear
- [ ] Correct/wrong indication shows

#### Round Progression
- [ ] Round number increments
- [ ] Eliminated count updates
- [ ] Player count decreases
- [ ] New questioner selected
- [ ] Process repeats for 3 rounds

#### Results Phase
- [ ] Winner/loser status correct
- [ ] Prize amount displays correctly
- [ ] Survivor count correct
- [ ] Can claim prize (if winner)
- [ ] Prize transaction confirms
- [ ] Can play again
- [ ] Returns to home

### 5. Error Handling
- [ ] Insufficient funds error shows clearly
- [ ] User rejection handled gracefully
- [ ] Network errors display properly
- [ ] Can retry failed transactions
- [ ] Error messages are user-friendly

### 6. Performance
- [ ] Polling doesn't cause lag
- [ ] No memory leaks
- [ ] Components render efficiently
- [ ] No unnecessary re-renders
- [ ] Loading states are smooth

### 7. UI/UX
- [ ] All buttons work
- [ ] Loading indicators show
- [ ] Transitions are smooth
- [ ] Mobile responsive
- [ ] Wallet modal works
- [ ] No layout shifts

## Deployment Steps

### 1. Build
```bash
cd frontend/client
npm run build
```
- [ ] Build completes without errors
- [ ] No TypeScript errors
- [ ] No linting errors
- [ ] Bundle size is reasonable

### 2. Test Production Build
```bash
npm run preview
```
- [ ] Preview server starts
- [ ] All features work in production build
- [ ] No console errors
- [ ] Performance is good

### 3. Deploy to Hosting
Choose your platform:

#### Vercel
```bash
npm install -g vercel
vercel
```
- [ ] Project linked
- [ ] Environment variables set
- [ ] Deployment successful
- [ ] Custom domain configured (optional)

#### Netlify
```bash
npm install -g netlify-cli
netlify deploy --prod
```
- [ ] Site created
- [ ] Build settings configured
- [ ] Deployment successful
- [ ] Custom domain configured (optional)

#### Other Platforms
- [ ] Build artifacts uploaded
- [ ] Server configured
- [ ] SSL certificate installed
- [ ] Domain pointed correctly

### 4. Post-Deployment Verification
- [ ] Site loads correctly
- [ ] Wallet connection works
- [ ] Can create game
- [ ] Can join game
- [ ] Can play full game
- [ ] Can claim prize
- [ ] No console errors
- [ ] Analytics tracking (if configured)

## Mainnet Deployment

### Additional Steps for Mainnet
- [ ] Contract audited (recommended)
- [ ] Contract deployed to mainnet
- [ ] Update `GAME_PACKAGE_ID` to mainnet package
- [ ] Update RPC endpoint to mainnet
- [ ] Test with real SUI (small amounts first)
- [ ] Monitor for issues
- [ ] Set up error tracking (Sentry, etc.)
- [ ] Set up analytics (Google Analytics, etc.)

## Monitoring

### Post-Launch
- [ ] Monitor transaction success rate
- [ ] Track user engagement
- [ ] Watch for error patterns
- [ ] Monitor gas costs
- [ ] Check contract balance
- [ ] Review user feedback

### Metrics to Track
- [ ] Daily active users
- [ ] Games created
- [ ] Games completed
- [ ] Average game duration
- [ ] Prize pool sizes
- [ ] Transaction failure rate
- [ ] Wallet connection rate

## Troubleshooting

### Common Issues

#### "Game not found"
- Check GAME_PACKAGE_ID is correct
- Verify network (testnet vs mainnet)
- Check game object exists on explorer

#### "Transaction failed"
- Check wallet has enough SUI
- Verify gas budget is sufficient
- Check contract is not paused
- Review transaction on explorer

#### "Polling not working"
- Check RPC endpoint is responsive
- Verify game ID is correct
- Check browser console for errors
- Test network connection

#### "State not updating"
- Verify polling interval is running
- Check game status on explorer
- Review state in React DevTools
- Check for JavaScript errors

## Rollback Plan

If issues occur:
1. [ ] Revert to previous deployment
2. [ ] Notify users of maintenance
3. [ ] Fix issues in development
4. [ ] Test thoroughly
5. [ ] Redeploy

## Security Checklist

- [ ] No private keys in code
- [ ] No sensitive data in frontend
- [ ] HTTPS enabled
- [ ] CORS configured correctly
- [ ] Rate limiting (if applicable)
- [ ] Input validation
- [ ] XSS protection
- [ ] CSRF protection (if applicable)

## Documentation

- [ ] README updated
- [ ] API documentation (if applicable)
- [ ] User guide created
- [ ] FAQ prepared
- [ ] Support channels set up

## Marketing (Optional)

- [ ] Social media announcement
- [ ] Blog post
- [ ] Community notification
- [ ] Press release (if major launch)
- [ ] Demo video
- [ ] Screenshots

## Legal (If Required)

- [ ] Terms of service
- [ ] Privacy policy
- [ ] Cookie policy
- [ ] Disclaimer
- [ ] Age verification (if gambling)

## Final Checks

- [ ] All team members notified
- [ ] Support team ready
- [ ] Monitoring dashboards set up
- [ ] Backup plan in place
- [ ] Contact information updated
- [ ] Launch announcement ready

## Post-Launch Tasks

### Week 1
- [ ] Monitor closely for issues
- [ ] Respond to user feedback
- [ ] Fix critical bugs immediately
- [ ] Gather usage data

### Week 2-4
- [ ] Analyze metrics
- [ ] Plan improvements
- [ ] Address non-critical bugs
- [ ] Optimize performance

### Month 2+
- [ ] Add new features
- [ ] Improve UX based on feedback
- [ ] Scale infrastructure if needed
- [ ] Plan next version

---

## Quick Reference

### Important URLs
- Contract Explorer: `https://suiexplorer.com/object/[PACKAGE_ID]?network=testnet`
- Frontend: `https://your-domain.com`
- Documentation: `https://docs.your-domain.com`

### Important Commands
```bash
# Development
npm run dev

# Build
npm run build

# Preview
npm run preview

# Deploy (Vercel)
vercel --prod

# Deploy (Netlify)
netlify deploy --prod
```

### Support Contacts
- Technical Lead: [email]
- DevOps: [email]
- Support: [email]

---

**Last Updated**: [Date]
**Deployed By**: [Name]
**Version**: [Version Number]
