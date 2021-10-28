const firebase = require("@firebase/rules-unit-testing");

const PROJECT_ID = "parandum";
const myId = "user_01";
const theirId = "user_02";
const myAuth = { uid: myId, email: "testing_parandum_firestore@mgrove.uk" };
const myAdminAuth = { uid: myId, email: "user_01@mgrove.uk", admin: true };
const groupOne = "group_01";
const groupTwo = "group_02";
const setOne = "set_01";
const progressOne = "progress_01";
const vocabOne = "vocab_01";
const joinCodeOne = "join_code_01";

function getFirestore(auth) {
	return firebase.initializeTestApp({ projectId: PROJECT_ID, auth: auth }).firestore();
}

function getAdminFirestore() {
	return firebase.initializeAdminApp({ projectId: PROJECT_ID }).firestore();
}

describe("Parandum Firestore database", () => {
	beforeEach(async () => {
		await firebase.clearFirestoreData({ projectId: PROJECT_ID });
	});

	afterEach(async () => {
		await firebase.clearFirestoreData({ projectId: PROJECT_ID });
	});
	
	it("Can read items in current user's user collection", async () => {
		const db = getFirestore(myAuth);
		const testDoc = db.collection("users").doc(myId);
		await firebase.assertSucceeds(testDoc.get());
	});

	it("Can't read items in other users' user collections", async () => {
		const db = getFirestore(myAuth);
		const testDoc = db.collection("users").doc(theirId);
		await firebase.assertFails(testDoc.get());
	});

	it("Can't create user collections", async () => {
		const db = getFirestore(myAuth);
		const myTestDoc = db.collection("users").doc(myId);
		const theirTestDoc = db.collection("users").doc(theirId);
		await firebase.assertFails(myTestDoc.set({ theme: "default" }));
		await firebase.assertFails(theirTestDoc.set({ theme: "default" }));
	});

	it("Can update current user's user collection", async () => {
		const admin = getAdminFirestore();
		await admin.collection("users").doc(myId).set({ theme: "default", coloredEdges: false });

		const db = getFirestore(myAuth);
		const myTestDoc = db.collection("users").doc(myId);
		await firebase.assertSucceeds(myTestDoc.update({ theme: "pink", coloredEdges: true }));
	});

	it("Can't update current user's user collection with invalid data types", async () => {
		const admin = getAdminFirestore();
		await admin.collection("users").doc(myId).set({ theme: "default", coloredEdges: false });

		const db = getFirestore(myAuth);
		const myTestDoc = db.collection("users").doc(myId);
		await firebase.assertFails(myTestDoc.update({ theme: 0, coloredEdges: 0 }));
	});

	it("Can't update current user's user collection with invalid fields", async () => {
		const db = getFirestore(myAuth);
		const myTestDoc = db.collection("users").doc(myId);
		await firebase.assertFails(myTestDoc.update({ invalid_field: "error" }));
	});

	it("Can't delete current user's user collection", async () => {
		const db = getFirestore(myAdminAuth);
		const testDoc = db.collection("users").doc(myId);
		await firebase.assertFails(testDoc.delete());
	});

	it("Can't delete other users' user collections when admin", async () => {
		const db = getFirestore(myAdminAuth);
		const testDoc = db.collection("users").doc(theirId);
		await firebase.assertFails(testDoc.delete());
	});

	it("Can't delete other users' user collections when not admin", async () => {
		const db = getFirestore(myAuth);
		const testDoc = db.collection("users").doc(theirId);
		await firebase.assertFails(testDoc.delete());
	});

	it("Can't delete other users' user collections when signed out", async () => {
		const db = getFirestore(null);
		const myTestDoc = db.collection("users").doc(myId);
		const theirTestDoc = db.collection("users").doc(theirId);
		await firebase.assertFails(myTestDoc.delete());
		await firebase.assertFails(theirTestDoc.delete());
	})

	it("Can read current user's groups", async () => {
		const db = getFirestore(myAuth);
		const testDoc = db.collection("users").doc(myId).collection("groups").doc(groupOne);
		await firebase.assertSucceeds(testDoc.get());
	});

	it("Can't read other users' groups", async () => {
		const db = getFirestore(myAuth);
		const testDoc = db.collection("users").doc(theirId).collection("groups").doc(groupOne);
		await firebase.assertFails(testDoc.get());
	});

	it("Can read other users' groups when admin", async () => {
		const db = getFirestore(myAdminAuth);
		const testDoc = db.collection("users").doc(theirId).collection("groups").doc(groupOne);
		await firebase.assertSucceeds(testDoc.get());
	});

	it("Can delete current user's groups", async () => {
		const db = getFirestore(myAuth);
		const testDoc = db.collection("users").doc(myId).collection("groups").doc(groupOne);
		await firebase.assertSucceeds(testDoc.delete());
	});

	it("Can't delete other users' groups", async () => {
		const db = getFirestore(myAuth);
		const testDoc = db.collection("users").doc(theirId).collection("groups").doc(groupOne);
		await firebase.assertFails(testDoc.delete());
	});

	it("Can delete other users' groups when admin", async () => {
		const db = getFirestore(myAdminAuth);
		const testDoc = db.collection("users").doc(theirId).collection("groups").doc(groupOne);
		await firebase.assertSucceeds(testDoc.delete());
	});

	it("Can add current user to group as any role when admin", async () => {
		const db = getFirestore(myAdminAuth);
		const testDoc = db.collection("users").doc(myId).collection("groups").doc(groupOne);
		await firebase.assertSucceeds(testDoc.set({role: "owner"}));
	});

	it("Can't add any user to group when group owner", async () => {
		const admin = getAdminFirestore();
		await admin.collection("users").doc(myId).collection("groups").doc(groupOne).set({role: "owner"});

		const db = getFirestore(myAuth);
		const testDoc = db.collection("users").doc(theirId).collection("groups").doc(groupOne);
		await firebase.assertFails(testDoc.set({role: "member"}));
	});

	it("Can't add other users to groups when not owner or admin", async() => {
		const db = getFirestore(myAuth);
		const testDoc = db.collection("users").doc(theirId).collection("groups").doc(groupOne);
		await firebase.assertFails(testDoc.set({role: "member"}));
	});

	it("Can add current user to groups as member", async () => {
		const db = getFirestore(myAuth);
		const testDoc = db.collection("users").doc(myId).collection("groups").doc(groupOne);
		await firebase.assertSucceeds(testDoc.set({role: "member"}));
	});

	it("Can't add current user to groups as contributor or owner when not admin", async () => {
		const db = getFirestore(myAuth);
		const testDocOne = db.collection("users").doc(myId).collection("groups").doc(groupOne);
		const testDocTwo = db.collection("users").doc(myId).collection("groups").doc(groupTwo);
		await firebase.assertFails(testDocOne.set({ role: "owner" }));
		await firebase.assertFails(testDocTwo.set({ role: "contributor" }));
	});

	it("Can't add users to groups with invalid roles", async () => {
		const db = getFirestore(myAdminAuth);
		const testDocOne = db.collection("users").doc(myId).collection("groups").doc(groupOne);
		const testDocTwo = db.collection("users").doc(myId).collection("groups").doc(groupTwo);
		await firebase.assertSucceeds(testDocOne.set({ role: "member" }));
		await firebase.assertFails(testDocTwo.set({ role: "invalid_role" }));
	});

	it("Can't add users to groups with invalid fields", async () => {
		const db = getFirestore(myAdminAuth);
		const testDoc = db.collection("users").doc(myId).collection("groups").doc(groupOne);
		await firebase.assertFails(testDoc.set({ invalid_field: "error" }));
	});

	it("Can update other users' group roles to contributor or owner when admin", async () => {
		const admin = getAdminFirestore();
		await admin.collection("users").doc(theirId).collection("groups").doc(groupOne).set({ role: "member" });
		
		const db = getFirestore(myAdminAuth);
		const testDoc = db.collection("users").doc(theirId).collection("groups").doc(groupOne);
		await firebase.assertSucceeds(testDoc.update({ role: "contributor" }));
		await firebase.assertSucceeds(testDoc.update({ role: "owner" }));
	});

	it("Can update other users' group roles to contributor or owner when group owner", async () => {
		const admin = getAdminFirestore();
		await admin.collection("users").doc(myId).collection("groups").doc(groupOne).set({ role: "owner" });
		await admin.collection("users").doc(theirId).collection("groups").doc(groupOne).set({ role: "member" });

		const db = getFirestore(myAuth);
		const testDoc = db.collection("users").doc(theirId).collection("groups").doc(groupOne);
		await firebase.assertSucceeds(testDoc.update({ role: "contributor" }));
		await firebase.assertSucceeds(testDoc.update({ role: "owner" }));
	});

	it("Can't update current user's group role to contributor or member when group owner", async () => {
		const admin = getAdminFirestore();
		await admin.collection("users").doc(myId).collection("groups").doc(groupOne).set({ role: "owner" });
		await admin.collection("groups").doc(groupOne).set({ owners: [myId] });

		const db = getFirestore(myAuth);
		const testDoc = db.collection("users").doc(myId).collection("groups").doc(groupOne);
		await firebase.assertFails(testDoc.update({ role: "contributor" }));
		await firebase.assertFails(testDoc.update({ role: "member" }));
	});

	it("Can update current user's group role to owner when admin", async () => {
		const admin = getAdminFirestore();
		await admin.collection("users").doc(myId).collection("groups").doc(groupOne).set({ role: "member" });
		await admin.collection("users").doc(theirId).collection("groups").doc(groupOne).set({ role: "owner" });
		await admin.collection("groups").doc(groupOne).set({ owners: [theirId], members: [myId] });
		
		const db = getFirestore(myAdminAuth);
		const testDoc = db.collection("users").doc(myId).collection("groups").doc(groupOne);
		await firebase.assertSucceeds(testDoc.update({ role: "owner" }));
	});

	it("Can't update users' group roles to contributor or owner when owner of different group", async () => {
		const admin = getAdminFirestore();
		await admin.collection("users").doc(myId).collection("groups").doc(groupOne).set({ role: "owner" });
		await admin.collection("users").doc(theirId).collection("groups").doc(groupOne).set({ role: "member" });

		const db = getFirestore(myAuth);
		const testDoc = db.collection("users").doc(theirId).collection("groups").doc(groupTwo);
		await firebase.assertFails(testDoc.update({ role: "member" }));
		await firebase.assertFails(testDoc.update({ role: "contributor" }));
		await firebase.assertFails(testDoc.update({ role: "owner" }));
	});

	it("Can't update users' group roles to contributor or owner when not owner or admin", async () => {
		const admin = getAdminFirestore();
		await admin.collection("users").doc(myId).collection("groups").doc(groupOne).set({ role: "member" });
		
		const db = getFirestore(myAuth);
		const testDoc = db.collection("users").doc(myId).collection("groups").doc(groupOne);
		await firebase.assertFails(testDoc.update({ role: "contributor" }));
		await firebase.assertFails(testDoc.update({ role: "owner" }));
	});

	it("Can't update users' group roles to invalid values", async () => {
		const admin = getAdminFirestore();
		await admin.collection("users").doc(myId).collection("groups").doc(groupOne).set({ role: "owner" });
		await admin.collection("users").doc(theirId).collection("groups").doc(groupOne).set({ role: "owner" });
		await admin.collection("groups").doc(groupOne).set({ owners: [myId, theirId] });

		const db = getFirestore(myAdminAuth);
		const testDoc = db.collection("users").doc(theirId).collection("groups").doc(groupOne);
		await firebase.assertSucceeds(testDoc.update({ role: "member" }));
		await firebase.assertSucceeds(testDoc.update({ role: "contributor" }));
		await firebase.assertSucceeds(testDoc.update({ role: "owner" }));
		await firebase.assertFails(testDoc.update({ role: "invalid_role" }));
	});

	it("Can't update invalid fields in users' group data", async () => {
		const db = getFirestore(myAdminAuth);
		const testDoc = db.collection("users").doc(myId).collection("groups").doc(groupOne);
		await firebase.assertFails(testDoc.update({ invalid_field: "error" }));
	});

	it("Can read groups current user is a member of", async () => {
		const admin = getAdminFirestore();
		await admin.collection("users").doc(myId).collection("groups").doc(groupOne).set({ role: "member" });

		const db = getFirestore(myAuth);
		const testDoc = db.collection("groups").doc(groupOne);
		await firebase.assertSucceeds(testDoc.get());
	});

	it("Can read all groups when admin", async () => {
		const db = getFirestore(myAdminAuth);
		const testDoc = db.collection("groups").doc(groupOne);
		await firebase.assertSucceeds(testDoc.get());
	});

	it("Can't read groups when not member and not admin", async () => {
		const db = getFirestore(myAuth);
		const testDoc = db.collection("groups").doc(groupOne);
		await firebase.assertFails(testDoc.get());
	});

	it("Can't create group when not group owner", async () => {
		const admin = getAdminFirestore();
		await admin.collection("users").doc(myId).collection("groups").doc(groupOne).set({ role: "member" });

		const db = getFirestore(myAuth);
		const testDoc = db.collection("groups").doc(groupOne);
		await firebase.assertFails(testDoc.set({ display_name: "Test Group" }));
	});

	it("Can't create group with invalid data types", async () => {
		const admin = getAdminFirestore();
		await admin.collection("users").doc(myId).collection("groups").doc(groupOne).set({ role: "owner" });

		const db = getFirestore(myAuth);
		const testDoc = db.collection("groups").doc(groupOne);
		await firebase.assertFails(testDoc.set({ display_name: 0 }));
	});

	it("Can't create group with invalid fields", async () => {
		const admin = getAdminFirestore();
		await admin.collection("users").doc(myId).collection("groups").doc(groupOne).set({ role: "owner" });

		const db = getFirestore(myAuth);
		const testDoc = db.collection("groups").doc(groupOne);
		await firebase.assertFails(testDoc.set({ invalid_field: "error" }));
	});

	it("Can update group display name when group owner", async () => {
		const admin = getAdminFirestore();
		await admin.collection("users").doc(myId).collection("groups").doc(groupOne).set({ role: "owner" });
		await admin.collection("groups").doc(groupOne).set({ display_name: "Test Group", join_code: "abcd1234", sets: null, users: null });

		const db = getFirestore(myAdminAuth);
		const testDoc = db.collection("groups").doc(groupOne);
		await firebase.assertSucceeds(testDoc.update({ display_name: "Test Group 1" }));
	});

	it("Can update group display name when admin", async () => {
		const admin = getAdminFirestore();
		await admin.collection("groups").doc(groupOne).set({ display_name: "Test Group", join_code: "abcd1234", sets: null, users: null });

		const db = getFirestore(myAdminAuth);
		const testDoc = db.collection("groups").doc(groupOne);
		await firebase.assertSucceeds(testDoc.update({ display_name: "Test Group 1" }));
	});

	it("Can't update group display name when not group owner or admin", async () => {
		const admin = getAdminFirestore();
		await admin.collection("groups").doc(groupOne).set({ display_name: "Test Group" });
		await admin.collection("users").doc(myId).collection("groups").doc(groupOne).set({ role: "member" });

		const db = getFirestore(myAuth);
		const testDoc = db.collection("groups").doc(groupOne);
		await firebase.assertFails(testDoc.update({ display_name: "Test Group 1" }));
	});

	it("Can't update group to have invalid data types", async () => {
		const admin = getAdminFirestore();
		await admin.collection("groups").doc(groupOne).set({ display_name: "Test Group" });

		const db = getFirestore(myAdminAuth);
		const testDoc = db.collection("groups").doc(groupOne);
		await firebase.assertFails(testDoc.update({ display_name: 0 }));
	});

	it("Can't update group with invalid fields", async () => {
		const db = getFirestore(myAdminAuth);
		const testDoc = db.collection("groups").doc(groupOne);
		await firebase.assertFails(testDoc.update({ invalid_field: "error" }));
	});

	it("Can delete group when admin", async () => {
		const admin = getAdminFirestore();
		await admin.collection("groups").doc(groupOne).set({ display_name: "Test Group" });

		const db = getFirestore(myAdminAuth);
		const testDoc = db.collection("groups").doc(groupOne);
		await firebase.assertSucceeds(testDoc.delete());
	});

	it("Can delete group when group owner", async () => {
		const admin = getAdminFirestore();
		await admin.collection("groups").doc(groupOne).set({ display_name: "Test Group" });
		await admin.collection("users").doc(myId).collection("groups").doc(groupOne).set({ role: "owner" });

		const db = getFirestore(myAuth);
		const testDoc = db.collection("groups").doc(groupOne);
		await firebase.assertSucceeds(testDoc.delete());
	});

	it("Can't delete group when not admin or group owner", async () => {
		const admin = getAdminFirestore();
		await admin.collection("groups").doc(groupOne).set({ display_name: "Test Group" });

		const db = getFirestore(myAuth);
		const testDoc = db.collection("groups").doc(groupOne);
		await firebase.assertFails(testDoc.delete());
	});
	
	it("Can read current user's sets", async () => {
		const admin = getAdminFirestore();
		await admin.collection("sets").doc(setOne).set({ owner: myId });

		const db = getFirestore(myAuth);
		const testDoc = db.collection("sets").doc(setOne);
		await firebase.assertSucceeds(testDoc.get());
	});

	it("Can read public sets", async () => {
		const admin = getAdminFirestore();
		await admin.collection("sets").doc(setOne).set({ public: true });

		const db = getFirestore(myAuth);
		const testDoc = db.collection("sets").doc(setOne);
		await firebase.assertSucceeds(testDoc.get());
	});

	it("Can delete current user's sets when they are not in any groups", async () => {
		const admin = getAdminFirestore();
		await admin.collection("sets").doc(setOne).set({ owner: myId, groups: [] });

		const db = getFirestore(myAuth);
		const testDoc = db.collection("sets").doc(setOne);
		await firebase.assertSucceeds(testDoc.delete());
	});

	it("Can't delete current user's sets when they are in groups", async () => {
		const admin = getAdminFirestore();
		await admin.collection("sets").doc(setOne).set({ owner: myId, groups: [groupOne] });

		const db = getFirestore(myAuth);
		const testDoc = db.collection("sets").doc(setOne);
		await firebase.assertFails(testDoc.delete());
	});

	it("Can't delete other users' sets", async () => {
		const admin = getAdminFirestore();
		await admin.collection("sets").doc(setOne).set({ owner: theirId });

		const db = getFirestore(myAuth);
		const testDoc = db.collection("sets").doc(setOne);
		await firebase.assertFails(testDoc.delete());
	});

	it("Can create sets with current user as owner", async () => {
		const db = getFirestore(myAuth);
		const testDoc = db.collection("sets").doc(setOne);
		await firebase.assertSucceeds(testDoc.set({ owner: myId, public: true, title: "Set Title", groups: [] }));
	});

	it("Can't create sets with other user as owner", async () => {
		const db = getFirestore(myAuth);
		const testDoc = db.collection("sets").doc(setOne);
		await firebase.assertFails(testDoc.set({ owner: theirId, public: true, title: "Set Title" }));
	});

	it("Can't create sets with invalid fields", async () => {
		const db = getFirestore(myAuth);
		const testDoc = db.collection("sets").doc(setOne);
		await firebase.assertFails(testDoc.set({ owner: myId, public: true, title: "Set Title", invalid_field: "error" }));
	});

	it("Can't create sets with invalid data types", async () => {
		const db = getFirestore(myAuth);
		const testDoc = db.collection("sets").doc(setOne);
		await firebase.assertFails(testDoc.set({ owner: myId, public: 0, title: 0 }));
	});

	it("Can't create sets without required fields", async () => {
		const db = getFirestore(myAuth);
		const testDoc = db.collection("sets").doc(setOne);
		await firebase.assertFails(testDoc.set({ owner: myId }));
	});

	it("Can update set titles and visibility when set not in any groups", async () => {
		const admin = getAdminFirestore();
		await admin.collection("sets").doc(setOne).set({ owner: myId, public: true, title: "Set Title", groups: [] });

		const db = getFirestore(myAuth);
		const testDoc = db.collection("sets").doc(setOne);
		await firebase.assertSucceeds(testDoc.update({ public: false, title: "Set Title 1" }));
	});

	it("Can't make set not public when it is in a group", async () => {
		const admin = getAdminFirestore();
		await admin.collection("sets").doc(setOne).set({ owner: myId, public: true, title: "Set Title", groups: [groupOne] });

		const db = getFirestore(myAuth);
		const testDoc = db.collection("sets").doc(setOne);
		await firebase.assertFails(testDoc.update({ public: false }));
	});

	it("Can't update set owners", async () => {
		const admin = getAdminFirestore();
		await admin.collection("sets").doc(setOne).set({ owner: myId, public: true, title: "Set Title" });

		const db = getFirestore(myAuth);
		const testDoc = db.collection("sets").doc(setOne);
		await firebase.assertFails(testDoc.update({ owner: "other_user" }));
	});

	it("Can't update sets with invalid fields", async () => {
		const admin = getAdminFirestore();
		await admin.collection("sets").doc(setOne).set({ owner: myId, public: true, title: "Set Title" });

		const db = getFirestore(myAuth);
		const testDoc = db.collection("sets").doc(setOne);
		await firebase.assertFails(testDoc.update({ invalid_field: "error" }));
	});

	it("Can't update sets with invalid data types", async () => {
		const admin = getAdminFirestore();
		await admin.collection("sets").doc(setOne).set({ owner: myId, public: true, title: "Set Title" });

		const db = getFirestore(myAuth);
		const testDoc = db.collection("sets").doc(setOne);
		await firebase.assertFails(testDoc.set({ public: 0, title: 0 }));
	});

	it("Can't update other users' sets", async () => {
		const admin = getAdminFirestore();
		await admin.collection("sets").doc(setOne).set({ owner: theirId, public: true, title: "Set Title" });

		const db = getFirestore(myAuth);
		const testDoc = db.collection("sets").doc(setOne);
		await firebase.assertFails(testDoc.update({ public: false }));
	});
	it("Can read current user's sets' vocab", async () => {
		const admin = getAdminFirestore();
		await admin.collection("sets").doc(setOne).set({ owner: myId });

		const db = getFirestore(myAuth);
		const testDoc = db.collection("sets").doc(setOne).collection("vocab").doc(vocabOne);
		await firebase.assertSucceeds(testDoc.get());
	});

	it("Can read public sets' vocab", async () => {
		const admin = getAdminFirestore();
		await admin.collection("sets").doc(setOne).set({ public: true });

		const db = getFirestore(myAuth);
		const testDoc = db.collection("sets").doc(setOne).collection("vocab").doc(vocabOne);
		await firebase.assertSucceeds(testDoc.get());
	});

	it("Can delete current user's sets' vocab", async () => {
		const admin = getAdminFirestore();
		await admin.collection("sets").doc(setOne).set({ owner: myId });

		const db = getFirestore(myAuth);
		const testDoc = db.collection("sets").doc(setOne).collection("vocab").doc(vocabOne);
		await firebase.assertSucceeds(testDoc.delete());
	});

	it("Can't delete other users' sets' vocab", async () => {
		const admin = getAdminFirestore();
		await admin.collection("sets").doc(setOne).set({ owner: theirId });

		const db = getFirestore(myAuth);
		const testDoc = db.collection("sets").doc(setOne).collection("vocab").doc(vocabOne);
		await firebase.assertFails(testDoc.delete());
	});

	it("Can create vocab in sets with current user as owner", async () => {
		const admin = getAdminFirestore();
		await admin.collection("sets").doc(setOne).set({ owner: myId });

		const db = getFirestore(myAuth);
		const testDoc = db.collection("sets").doc(setOne).collection("vocab").doc(vocabOne);
		await firebase.assertSucceeds(testDoc.set({ term: "value", definition: "value" }));
	});

	it("Can't create vocab in sets with other user as owner", async () => {
		const admin = getAdminFirestore();
		await admin.collection("sets").doc(setOne).set({ owner: theirId });

		const db = getFirestore(myAuth);
		const testDoc = db.collection("sets").doc(setOne).collection("vocab").doc(vocabOne);
		await firebase.assertFails(testDoc.set({ term: "value", definition: "value" }));
	});

	it("Can't create sets' vocab with invalid fields", async () => {
		const admin = getAdminFirestore();
		await admin.collection("sets").doc(setOne).set({ owner: myId });

		const db = getFirestore(myAuth);
		const testDoc = db.collection("sets").doc(setOne).collection("vocab").doc(vocabOne);
		await firebase.assertFails(testDoc.set({ term: "value", definition: "value", invalid_field: "error" }));
	});

	it("Can't create sets' vocab with invalid data types", async () => {
		const admin = getAdminFirestore();
		await admin.collection("sets").doc(setOne).set({ owner: myId });

		const db = getFirestore(myAuth);
		const testDoc = db.collection("sets").doc(setOne).collection("vocab").doc(vocabOne);
		await firebase.assertFails(testDoc.set({ term: 0, definition: 0 }));
	});

	it("Can't create sets' vocab without required fields", async () => {
		const db = getFirestore(myAuth);
		const testDoc = db.collection("sets").doc(setOne).collection("vocab").doc(vocabOne);
		await firebase.assertFails(testDoc.set({ term: "value" }));
	});

	it("Can update sets' vocab", async () => {
		const admin = getAdminFirestore();
		await admin.collection("sets").doc(setOne).set({ owner: myId });
		await admin.collection("sets").doc(setOne).collection("vocab").doc(vocabOne).set({ term: "value", definition: "value" });

		const db = getFirestore(myAuth);
		const testDoc = db.collection("sets").doc(setOne).collection("vocab").doc(vocabOne);
		await firebase.assertSucceeds(testDoc.update({ term: "value 1", definition: "definition 1" }));
	});

	it("Can't update sets' vocab with invalid fields", async () => {
		const admin = getAdminFirestore();
		await admin.collection("sets").doc(setOne).set({ owner: myId });
		await admin.collection("sets").doc(setOne).collection("vocab").doc(vocabOne).set({ term: "value", definition: "value" });

		const db = getFirestore(myAuth);
		const testDoc = db.collection("sets").doc(setOne).collection("vocab").doc(vocabOne);
		await firebase.assertFails(testDoc.update({ invalid_field: "error" }));
	});

	it("Can't update sets' vocab with invalid data types", async () => {
		const admin = getAdminFirestore();
		await admin.collection("sets").doc(setOne).set({ owner: myId });
		await admin.collection("sets").doc(setOne).collection("vocab").doc(vocabOne).set({ term: "value", definition: "value" });

		const db = getFirestore(myAuth);
		const testDoc = db.collection("sets").doc(setOne).collection("vocab").doc(vocabOne);
		await firebase.assertFails(testDoc.set({ term: 0, definition: 0 }));
	});

	it("Can't update other users' sets' vocab", async () => {
		const admin = getAdminFirestore();
		await admin.collection("sets").doc(setOne).set({ owner: theirId });
		await admin.collection("sets").doc(setOne).collection("vocab").doc(vocabOne).set({ term: "value", definition: "value" });

		const db = getFirestore(myAuth);
		const testDoc = db.collection("sets").doc(setOne).collection("vocab").doc(vocabOne);
		await firebase.assertFails(testDoc.update({ term: "value 1" }));
	});
	
	it("Can read current user's progress data", async () => {
		const admin = getAdminFirestore();
		await admin.collection("progress").doc(progressOne).set({ uid: myId });

		const db = getFirestore(myAuth);
		const testDoc = db.collection("progress").doc(progressOne);
		await firebase.assertSucceeds(testDoc.get());
	});

	it("Can't read other users' progress data", async () => {
		const admin = getAdminFirestore();
		await admin.collection("progress").doc(progressOne).set({ uid: theirId });

		const db = getFirestore(myAuth);
		const testDoc = db.collection("progress").doc(progressOne);
		await firebase.assertFails(testDoc.get());
	});

	it("Can delete current user's progress data when not complete", async () => {
		const admin = getAdminFirestore();
		await admin.collection("progress").doc(progressOne).set({ uid: myId, progress: 0, questions: [0] });

		const db = getFirestore(myAuth);
		const testDoc = db.collection("progress").doc(progressOne);
		await firebase.assertSucceeds(testDoc.delete());
	});

	it("Can't delete other users' progress data", async () => {
		const admin = getAdminFirestore();
		await admin.collection("progress").doc(progressOne).set({ uid: theirId, progress: 0, questions: [0] });

		const db = getFirestore(myAuth);
		const testDoc = db.collection("progress").doc(progressOne);
		await firebase.assertFails(testDoc.delete());
	});

	it("Can't delete current user's progress data when complete", async () => {
		const admin = getAdminFirestore();
		await admin.collection("progress").doc(progressOne).set({ uid: theirId, progress: 1, questions: [0] });

		const db = getFirestore(myAuth);
		const testDoc = db.collection("progress").doc(progressOne);
		await firebase.assertFails(testDoc.delete());
	});

	it("Can read current user's progress terms when language is not switched", async () => {
		const admin = getAdminFirestore();
		await admin.collection("progress").doc(progressOne).set({ uid: myId, switch_language: false });

		const db = getFirestore(myAuth);
		const testDoc = db.collection("progress").doc(progressOne).collection("terms").doc(vocabOne);
		await firebase.assertSucceeds(testDoc.get());
	});

	it("Can't read other users' progress terms", async () => {
		const admin = getAdminFirestore();
		await admin.collection("progress").doc(progressOne).set({ uid: theirId, switch_language: false });

		const db = getFirestore(myAuth);
		const testDoc = db.collection("progress").doc(progressOne).collection("terms").doc(vocabOne);
		await firebase.assertFails(testDoc.get());
	});

	it("Can't read current user's progress terms when language is switched", async () => {
		const admin = getAdminFirestore();
		await admin.collection("progress").doc(progressOne).set({ uid: myId, switch_language: true });

		const db = getFirestore(myAuth);
		const testDoc = db.collection("progress").doc(progressOne).collection("terms").doc(vocabOne);
		await firebase.assertFails(testDoc.get());
	});

	it("Can't delete current user's progress terms when not complete", async () => {
		const admin = getAdminFirestore();
		await admin.collection("progress").doc(progressOne).set({ uid: myId, progress: 0, questions: [0] });

		const db = getFirestore(myAuth);
		const testDoc = db.collection("progress").doc(progressOne).collection("terms").doc(vocabOne);
		await firebase.assertFails(testDoc.delete());
	});

	it("Can't delete other users' progress terms", async () => {
		const admin = getAdminFirestore();
		await admin.collection("progress").doc(progressOne).set({ uid: theirId, progress: 0, questions: [0] });

		const db = getFirestore(myAuth);
		const testDoc = db.collection("progress").doc(progressOne).collection("terms").doc(vocabOne);
		await firebase.assertFails(testDoc.delete());
	});

	it("Can't delete current user's progress terms when complete", async () => {
		const admin = getAdminFirestore();
		await admin.collection("progress").doc(progressOne).set({ uid: theirId, progress: 1, questions: [0] });

		const db = getFirestore(myAuth);
		const testDoc = db.collection("progress").doc(progressOne).collection("terms").doc(vocabOne);
		await firebase.assertFails(testDoc.delete());
	});

	it("Can read current user's progress definitions when language is switched", async () => {
		const admin = getAdminFirestore();
		await admin.collection("progress").doc(progressOne).set({ uid: myId, switch_language: true });

		const db = getFirestore(myAuth);
		const testDoc = db.collection("progress").doc(progressOne).collection("definitions").doc(vocabOne);
		await firebase.assertSucceeds(testDoc.get());
	});

	it("Can't read other users' progress definitions", async () => {
		const admin = getAdminFirestore();
		await admin.collection("progress").doc(progressOne).set({ uid: theirId, switch_language: true });

		const db = getFirestore(myAuth);
		const testDoc = db.collection("progress").doc(progressOne).collection("definitions").doc(vocabOne);
		await firebase.assertFails(testDoc.get());
	});

	it("Can't read current user's progress definitions when language is not switched", async () => {
		const admin = getAdminFirestore();
		await admin.collection("progress").doc(progressOne).set({ uid: myId, switch_language: false });

		const db = getFirestore(myAuth);
		const testDoc = db.collection("progress").doc(progressOne).collection("definitions").doc(vocabOne);
		await firebase.assertFails(testDoc.get());
	});

	it("Can't delete current user's progress definitions when not complete", async () => {
		const admin = getAdminFirestore();
		await admin.collection("progress").doc(progressOne).set({ uid: myId, progress: 0, questions: [0] });

		const db = getFirestore(myAuth);
		const testDoc = db.collection("progress").doc(progressOne).collection("definitions").doc(vocabOne);
		await firebase.assertFails(testDoc.delete());
	});

	it("Can't delete other users' progress definitions", async () => {
		const admin = getAdminFirestore();
		await admin.collection("progress").doc(progressOne).set({ uid: theirId, progress: 0, questions: [0] });

		const db = getFirestore(myAuth);
		const testDoc = db.collection("progress").doc(progressOne).collection("definitions").doc(vocabOne);
		await firebase.assertFails(testDoc.delete());
	});

	it("Can't delete current user's progress definitions when complete", async () => {
		const admin = getAdminFirestore();
		await admin.collection("progress").doc(progressOne).set({ uid: theirId, progress: 1, questions: [0] });

		const db = getFirestore(myAuth);
		const testDoc = db.collection("progress").doc(progressOne).collection("definitions").doc(vocabOne);
		await firebase.assertFails(testDoc.delete());
	});

	it("Can read current user's progress terms and definitions when complete", async () => {
		const admin = getAdminFirestore();
		await admin.collection("progress").doc(progressOne).set({ uid: myId, questions: ["q"], progress: 1 });

		const db = getFirestore(myAuth);
		const testDocOne = db.collection("progress").doc(progressOne).collection("terms").doc(vocabOne);
		const testDocTwo = db.collection("progress").doc(progressOne).collection("definitions").doc(vocabOne);
		await firebase.assertSucceeds(testDocOne.get());
		await firebase.assertSucceeds(testDocTwo.get());
	});

	it("Can read join codes when signed in", async () => {
		const db = getFirestore(myAuth);
		const testDoc = db.collection("join_codes").doc(joinCodeOne);
		await firebase.assertSucceeds(testDoc.get());
	});

	it("Can't read join codes when not signed in", async () => {
		const db = getFirestore(null);
		const testDoc = db.collection("join_codes").doc(joinCodeOne);
		await firebase.assertFails(testDoc.get());
	});

	it("Can read completed progress docs when signed in", async () => {
		const db = getFirestore(myAuth);
		const testDoc = db.collection("completed_progress").doc(setOne);
		await firebase.assertSucceeds(testDoc.get());
	});

	it("Can't read completed progress docs when not signed in", async () => {
		const db = getFirestore(null);
		const testDoc = db.collection("completed_progress").doc(setOne);
		await firebase.assertFails(testDoc.get());
	});
});