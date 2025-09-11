// 🎯 REAL WAITLIST PROMOTION SCENARIO WITH BULLMQ NOTIFICATIONS

console.log('🎪 SCENARIO: Taylor Swift concert waitlist promotion\n');

// ===== STEP 1: Someone cancels their ticket =====
console.log('💔 User cancels ticket → Spot opens up');
console.log('🔄 System automatically promotes person #1 from waitlist\n');

// This happens in your cancellation controller:
async function handleCancellation() {
  // 1. Cancel the booking
  await prisma.booking.update({
    where: { id: 'booking_123' },
    data: { status: 'CANCELLED' }
  });
  
  // 2. Get next person from waitlist
  const nextInLine = await prisma.waitlist.findFirst({
    where: { eventId: 'taylor_swift' },
    orderBy: { position: 'asc' },
    include: { user: true, event: true }
  });
  
  if (nextInLine) {
    // 3. Create their booking
    const newBooking = await prisma.booking.create({
      data: {
        userId: nextInLine.userId,
        eventId: nextInLine.eventId,
        status: 'CONFIRMED'
      }
    });
    
    // 4. 🚀 ADD JOB TO QUEUE - This is where BullMQ magic happens!
    await emailQueue.add('waitlist_promotion', {
      type: 'waitlist_promotion',
      to: nextInLine.user.email,
      userName: nextInLine.user.name,
      eventName: nextInLine.event.title,
      bookingId: newBooking.id,
      promotedAt: new Date().toISOString()
    });
    
    console.log(`📨 Promotion email queued for ${nextInLine.user.email}`);
  }
}

// ===== STEP 2: BullMQ Worker Processes the Job =====
console.log('⚡ BullMQ worker picks up promotion job...');

const emailWorker = new Worker('email-notifications', async (job) => {
  const { data } = job;
  
  if (data.type === 'waitlist_promotion') {
    console.log(`🎉 Processing promotion for ${data.to}`);
    
    // Send the actual email
    const emailResult = await sendPromotionEmail({
      to: data.to,
      subject: `🎉 You're in! ${data.eventName}`,
      template: 'waitlist-promotion',
      data: {
        userName: data.userName,
        eventName: data.eventName,
        bookingId: data.bookingId,
        nextSteps: 'Complete your payment within 24 hours'
      }
    });
    
    console.log(`✅ Promotion email sent successfully!`);
    
    // Return success data
    return {
      success: true,
      emailSent: true,
      recipient: data.to,
      emailId: emailResult.id,
      sentAt: new Date().toISOString()
    };
  }
});

// ===== STEP 3: Success Notification Triggers =====
emailWorker.on('completed', async (job, result) => {
  console.log(`\n🎊 SUCCESS NOTIFICATION TRIGGERED:`);
  console.log(`   Promotion email sent to: ${result.recipient}`);
  console.log(`   Email ID: ${result.emailId}`);
  console.log(`   Sent at: ${result.sentAt}`);
  
  // Now trigger follow-up actions:
  
  // 1. Update waitlist status
  await prisma.waitlist.update({
    where: { 
      userId_eventId: {
        userId: job.data.userId,
        eventId: job.data.eventId
      }
    },
    data: { 
      status: 'PROMOTED',
      promotedAt: new Date()
    }
  });
  
  // 2. Update all other waitlist positions
  await prisma.waitlist.updateMany({
    where: { 
      eventId: job.data.eventId,
      position: { gt: job.data.oldPosition }
    },
    data: {
      position: { decrement: 1 }
    }
  });
  
  // 3. Send real-time notification to admin dashboard
  io.emit('waitlist_promotion', {
    eventId: job.data.eventId,
    promotedUser: result.recipient,
    newWaitlistSize: await getWaitlistSize(job.data.eventId)
  });
  
  // 4. Schedule payment reminder (24 hours later)
  await emailQueue.add('payment_reminder', {
    type: 'payment_reminder',
    to: result.recipient,
    bookingId: job.data.bookingId
  }, {
    delay: 24 * 60 * 60 * 1000 // 24 hours
  });
  
  console.log(`   ✅ All follow-up actions completed`);
  console.log(`   📅 Payment reminder scheduled for 24 hours`);
});

// ===== STEP 4: Failure Handling =====
emailWorker.on('failed', async (job, error) => {
  console.log(`\n❌ EMAIL FAILED NOTIFICATION:`);
  console.log(`   Job: ${job.id}`);
  console.log(`   Error: ${error.message}`);
  console.log(`   Attempts: ${job.attemptsMade}/${job.opts.attempts}`);
  
  if (job.attemptsMade >= job.opts.attempts) {
    // Permanent failure - alert admin
    console.log(`   🚨 CRITICAL: Promotion email permanently failed!`);
    
    // Send alert to admin
    await emailQueue.add('admin_alert', {
      type: 'admin_alert',
      subject: 'URGENT: Waitlist promotion email failed',
      message: `Failed to notify user ${job.data.to} about promotion`,
      jobId: job.id
    });
    
    // Maybe revert the promotion?
    console.log(`   🔄 Consider reverting promotion for user safety`);
  }
});

console.log('\n🎯 SUMMARY: BullMQ Notification Flow');
console.log('=====================================');
console.log('1. 📥 Job added to queue (instant response to user)');
console.log('2. ⚡ Worker processes job (sends email)');
console.log('3. 🎉 Success event triggers → Updates database');
console.log('4. 🔔 Real-time notifications sent to admin dashboard');
console.log('5. 📅 Follow-up actions scheduled automatically');
console.log('6. ❌ Failures handled gracefully with retries');
console.log('\n🚀 Result: Bulletproof notification system!');
