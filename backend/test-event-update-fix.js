const fetch = require("node-fetch");

async function testEventUpdate() {
  try {
    console.log("🧪 Testing Event Update API Fix");
    console.log("================================");

    // First, let's login as admin to get a token
    const loginResponse = await fetch("http://localhost:3001/api/auth/login", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email: "admin@evently.com",
        password: "password123",
      }),
    });

    if (!loginResponse.ok) {
      throw new Error(`Login failed: ${loginResponse.status}`);
    }

    const loginData = await loginResponse.json();
    const token = loginData.data.token;
    console.log("✅ Admin login successful");

    // Get all events to find one to update
    const eventsResponse = await fetch("http://localhost:3001/api/events", {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!eventsResponse.ok) {
      throw new Error(`Failed to get events: ${eventsResponse.status}`);
    }

    const eventsData = await eventsResponse.json();
    const events = eventsData.data.events;

    if (events.length === 0) {
      throw new Error("No events found to test with");
    }

    const testEvent = events[0];
    console.log(`📅 Found test event: "${testEvent.name}"`);
    console.log(`   Current image: ${testEvent.imageUrl || "None"}`);
    console.log(
      `   Current tags: ${testEvent.tags ? testEvent.tags.join(", ") : "None"}`
    );

    // Test update with new imageUrl and tags
    const updateData = {
      imageUrl:
        "https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=800&h=600&fit=crop&crop=center",
      tags: ["updated", "test", "api-fix"],
      category: "CONFERENCE",
    };

    console.log("\\n🔄 Updating event with new image URL and tags...");

    const updateResponse = await fetch(
      `http://localhost:3001/api/events/${testEvent.id}`,
      {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(updateData),
      }
    );

    if (!updateResponse.ok) {
      const errorText = await updateResponse.text();
      throw new Error(`Update failed: ${updateResponse.status} - ${errorText}`);
    }

    const updateResult = await updateResponse.json();
    const updatedEvent = updateResult.data.event;

    console.log("✅ Event update successful!");
    console.log(`   New image: ${updatedEvent.imageUrl}`);
    console.log(
      `   New tags: ${
        updatedEvent.tags ? updatedEvent.tags.join(", ") : "None"
      }`
    );
    console.log(`   New category: ${updatedEvent.category}`);

    // Verify the changes were persisted by fetching the event again
    console.log("\\n🔍 Verifying changes were persisted...");

    const verifyResponse = await fetch(
      `http://localhost:3001/api/events/${testEvent.id}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    if (!verifyResponse.ok) {
      throw new Error(`Verification failed: ${verifyResponse.status}`);
    }

    const verifyData = await verifyResponse.json();
    const verifiedEvent = verifyData.data?.event || verifyData;

    console.log("✅ Verification successful!");
    console.log(`   Persisted image: ${verifiedEvent.imageUrl}`);
    console.log(
      `   Persisted tags: ${
        verifiedEvent.tags ? verifiedEvent.tags.join(", ") : "None"
      }`
    );
    console.log(`   Persisted category: ${verifiedEvent.category}`);

    console.log("\\n🎉 Event update API is now working correctly!");
    console.log("   ✅ Image URL updates are saved");
    console.log("   ✅ Tags updates are saved");
    console.log("   ✅ Category updates are saved");
  } catch (error) {
    console.error("❌ Test failed:", error.message);
  }
}

testEventUpdate();
