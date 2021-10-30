const test = require("firebase-functions-test")(
  {
    databaseURL: "https://parandum-learning-dev.firebaseio.com",
    storageBucket: "parandum-learning-dev.appspot.com",
    projectId: "parandum-learning-dev",
  },
  "_private_stuff/parandum-learning-dev-private-key.json"
);

const admin = require("firebase-admin");
const cloudFunctions = require("../functions/index.js");
const firebase = require("@firebase/rules-unit-testing");
const hamjest = require("hamjest");
const assert = require("assert");

admin.initializeApp();
const firestore = admin.firestore();

const userOne = "M3JPrFRH6Fdo8XMUbF0l2zVZUCH3";
const userTwo = "user_02";
const setOne = "set_01";
const setTwo = "set_02";
const vocabOne = "vocab_01";
const termOne = "term_01";
const definitionOne = "definition_01";
const definitionOneTypoOne = "ddefinition_01";
const definitionOneTypoTwo = "dinition_01";
const definitionOneTypoThree = "dinition_02";
const definitionOneTypoFour = "dinition_";
const shortDefinitionOne = "d1";
const shortDefinitionOneTypoOne = "f1";
const shortDefinitionOneTypoTwo = "f2";
const vocabTwo = "vocab_02";
const termTwo = "term_02";
const definitionTwo = "definition_02";
const vocabThree = "vocab_03";
const termThree = "term_03";
const definitionThree = "definition_03";
const groupOne = "group_01";
const groupTwo = "group_02";
const doubleDefinitionOne = "definition/01";
const doubleDefinitionTwo = "definition/02";
const punctuationDefinitionOne = "definition .,()-_'\"01";
const progressVocabOne = userOne + "__" + vocabOne;
const progressVocabTwo = userOne + "__" + vocabTwo;
const vocabFour = "vocab_04";
const progressVocabThree = userOne + "__" + vocabThree;
const progressVocabFour = userOne + "__" + vocabFour;
const incorrectAnswer = "incorrect";
const progressOne = "progress_01";

async function deleteCollection(db, collectionPath, batchSize) {
  const collectionRef = db.collection(collectionPath);
  const query = collectionRef.orderBy("__name__").limit(batchSize);

  return new Promise((resolve, reject) => {
    deleteQueryBatch(db, query, resolve).catch(reject);
  });
}

async function deleteQueryBatch(db, query, resolve) {
  const snapshot = await query.get();

  const batchSize = snapshot.size;
  if (batchSize === 0) {
    // When there are no documents left, we are done
    resolve();
    return;
  }

  // Delete documents in a batch
  const batch = db.batch();
  snapshot.docs.forEach((doc) => {
    batch.delete(doc.ref);
  });
  await batch.commit();

  // Recurse on the next process tick, to avoid
  // exploding the stack.
  process.nextTick(() => {
    deleteQueryBatch(db, query, resolve);
  });
}

describe("Parandum Cloud Functions", function () {
  this.timeout(5000);

  it("Can write & delete to/from online database", async () => {
    firebase.assertSucceeds(
      firestore.collection("testCollection").doc("testDoc").set({
        one: "1",
        two: "2",
      })
    );
    firebase.assertSucceeds(
      firestore.collection("testCollection").doc("testDoc").delete()
    );
  });

  it("createProgress can create new questions mode progress file from existing set", async () => {
    const createProgress = test.wrap(cloudFunctions.createProgress);

    const setDataOne = {
      owner: userOne,
      public: false,
      title: setOne,
    };
    const vocabDataOne = {
      term: termOne,
      definition: definitionOne,
    };
    const vocabDataTwo = {
      term: termTwo,
      definition: definitionTwo,
    };

    await firestore.collection("sets").doc(setOne).set(setDataOne);
    await firestore
      .collection("sets")
      .doc(setOne)
      .collection("vocab")
      .doc(vocabOne)
      .set(vocabDataOne);
    await firestore
      .collection("sets")
      .doc(setOne)
      .collection("vocab")
      .doc(vocabTwo)
      .set(vocabDataTwo);

    const requestData = {
      switch_language: false,
      sets: [setOne],
      mode: "questions",
      limit: 2,
    };

    const progressId = await createProgress(requestData);
    const progressDocId = firestore.collection("progress").doc(progressId);

    const snapAfter = await progressDocId.get().then((doc) => doc.data());
    const termOneSnapAfter = await progressDocId
      .collection("terms")
      .doc(progressVocabOne)
      .get()
      .then((doc) => doc.data());
    const definitionOneSnapAfter = await progressDocId
      .collection("definitions")
      .doc(progressVocabOne)
      .get()
      .then((doc) => doc.data());

    hamjest.assertThat(
      snapAfter.questions,
      hamjest.anyOf(
        hamjest.is([progressVocabOne, progressVocabTwo]),
        hamjest.is([progressVocabTwo, progressVocabOne])
      )
    );
    assert.deepStrictEqual(snapAfter.correct, []);
    assert.deepStrictEqual(snapAfter.incorrect, []);
    assert.deepStrictEqual(snapAfter.current_correct, []);
    assert.strictEqual(snapAfter.duration, null);
    assert.strictEqual(snapAfter.progress, 0);
    assert.deepStrictEqual(snapAfter.setIds, [setOne]);
    assert.strictEqual(snapAfter.set_title, setOne);
    assert.deepStrictEqual(snapAfter.set_titles, [setOne]);
    assert.notStrictEqual(snapAfter.start_time, null);
    assert.strictEqual(snapAfter.switch_language, false);
    assert.strictEqual(snapAfter.uid, userOne);
    assert.strictEqual(snapAfter.mode, "questions");
    assert.strictEqual(snapAfter.typo, false);

    assert.deepStrictEqual(termOneSnapAfter, {
      item: termOne,
    });
    assert.deepStrictEqual(definitionOneSnapAfter, {
      item: definitionOne,
    });
  });

  it("createProgress can create new questions mode progress file from multiple existing sets", async () => {
    const createProgress = test.wrap(cloudFunctions.createProgress);

    const setDataOne = {
      owner: userOne,
      public: false,
      title: setOne,
    };
    const vocabDataOne = {
      term: termOne,
      definition: definitionOne,
    };
    const vocabDataTwo = {
      term: termTwo,
      definition: definitionTwo,
    };
    const setDataTwo = {
      owner: userOne,
      public: false,
      title: setTwo,
    };
    const vocabDataThree = {
      term: termOne,
      definition: definitionOne,
    };
    const vocabDataFour = {
      term: termTwo,
      definition: definitionTwo,
    };

    await firestore.collection("sets").doc(setOne).set(setDataOne);
    await firestore
      .collection("sets")
      .doc(setOne)
      .collection("vocab")
      .doc(vocabOne)
      .set(vocabDataOne);
    await firestore
      .collection("sets")
      .doc(setOne)
      .collection("vocab")
      .doc(vocabTwo)
      .set(vocabDataTwo);
    await firestore.collection("sets").doc(setTwo).set(setDataTwo);
    await firestore
      .collection("sets")
      .doc(setTwo)
      .collection("vocab")
      .doc(vocabOne)
      .delete();
    await firestore
      .collection("sets")
      .doc(setTwo)
      .collection("vocab")
      .doc(vocabTwo)
      .delete();
    await firestore
      .collection("sets")
      .doc(setTwo)
      .collection("vocab")
      .doc(vocabThree)
      .set(vocabDataThree);
    await firestore
      .collection("sets")
      .doc(setTwo)
      .collection("vocab")
      .doc(vocabFour)
      .set(vocabDataFour);

    const requestData = {
      switch_language: false,
      sets: [setOne, setTwo],
      mode: "questions",
      limit: 4,
    };

    const progressId = await createProgress(requestData);
    const progressDocId = firestore.collection("progress").doc(progressId);

    const snapAfter = await progressDocId.get().then((doc) => doc.data());

    assert.deepStrictEqual(snapAfter.questions.sort(), [
      progressVocabOne,
      progressVocabTwo,
      progressVocabThree,
      progressVocabFour,
    ]);
    assert.deepStrictEqual(snapAfter.correct, []);
    assert.deepStrictEqual(snapAfter.incorrect, []);
    assert.deepStrictEqual(snapAfter.current_correct, []);
    assert.strictEqual(snapAfter.duration, null);
    assert.strictEqual(snapAfter.progress, 0);
    assert.deepStrictEqual(snapAfter.setIds, [setOne, setTwo]);
    assert.strictEqual(snapAfter.set_title, `${setOne} & ${setTwo}`);
    assert.deepStrictEqual(snapAfter.set_titles, [setOne, setTwo]);
    assert.notStrictEqual(snapAfter.start_time, null);
    assert.strictEqual(snapAfter.switch_language, false);
    assert.strictEqual(snapAfter.uid, userOne);
    assert.strictEqual(snapAfter.mode, "questions");
    assert.strictEqual(snapAfter.typo, false);
  });

  it("createProgress can create new lives mode progress file from existing set", async () => {
    const createProgress = test.wrap(cloudFunctions.createProgress);

    const setDataOne = {
      owner: userOne,
      public: false,
      title: setOne,
    };
    const vocabDataOne = {
      term: termOne,
      definition: definitionOne,
    };
    const vocabDataTwo = {
      term: termTwo,
      definition: definitionTwo,
    };

    await firestore.collection("sets").doc(setOne).set(setDataOne);
    await firestore
      .collection("sets")
      .doc(setOne)
      .collection("vocab")
      .doc(vocabOne)
      .set(vocabDataOne);
    await firestore
      .collection("sets")
      .doc(setOne)
      .collection("vocab")
      .doc(vocabTwo)
      .set(vocabDataTwo);

    const requestData = {
      switch_language: false,
      sets: [setOne],
      mode: "lives",
      limit: 2,
    };

    const progressId = await createProgress(requestData);
    const progressDocId = firestore.collection("progress").doc(progressId);

    const snapAfter = await progressDocId.get().then((doc) => doc.data());

    hamjest.assertThat(
      snapAfter.questions,
      hamjest.anyOf(
        hamjest.is([progressVocabOne, progressVocabTwo]),
        hamjest.is([progressVocabTwo, progressVocabOne])
      )
    );
    assert.deepStrictEqual(snapAfter.correct, []);
    assert.deepStrictEqual(snapAfter.incorrect, []);
    assert.deepStrictEqual(snapAfter.current_correct, []);
    assert.strictEqual(snapAfter.duration, null);
    assert.strictEqual(snapAfter.progress, 0);
    assert.deepStrictEqual(snapAfter.setIds, [setOne]);
    assert.strictEqual(snapAfter.set_title, setOne);
    assert.deepStrictEqual(snapAfter.set_titles, [setOne]);
    assert.notStrictEqual(snapAfter.start_time, null);
    assert.strictEqual(snapAfter.switch_language, false);
    assert.strictEqual(snapAfter.uid, userOne);
    assert.strictEqual(snapAfter.mode, "lives");
    assert.strictEqual(snapAfter.lives, 2);
    assert.strictEqual(snapAfter.typo, false);
  });

  it("createProgress can create new progress file from public set they aren't the owner of", async () => {
    const createProgress = test.wrap(cloudFunctions.createProgress);

    const setDataTwo = {
      owner: userTwo,
      public: true,
      title: setTwo,
    };
    const vocabDataOne = {
      term: termOne,
      definition: definitionOne,
    };
    const vocabDataTwo = {
      term: termTwo,
      definition: definitionTwo,
    };

    await firestore.collection("sets").doc(setTwo).set(setDataTwo);
    await firestore
      .collection("sets")
      .doc(setTwo)
      .collection("vocab")
      .doc(vocabOne)
      .set(vocabDataOne);
    await firestore
      .collection("sets")
      .doc(setTwo)
      .collection("vocab")
      .doc(vocabTwo)
      .set(vocabDataTwo);

    const requestData = {
      switch_language: false,
      sets: [setOne],
      mode: "questions",
      limit: 2,
    };

    firebase.assertSucceeds(createProgress(requestData));
  });

  it("createProgress can't create new progress file from non-public set they aren't the owner of", async () => {
    const createProgress = test.wrap(cloudFunctions.createProgress);

    const setDataTwo = {
      owner: userTwo,
      public: false,
      title: setTwo,
    };
    const vocabDataOne = {
      term: termOne,
      definition: definitionOne,
    };
    const vocabDataTwo = {
      term: termTwo,
      definition: definitionTwo,
    };

    await firestore.collection("sets").doc(setTwo).set(setDataTwo);
    await firestore
      .collection("sets")
      .doc(setTwo)
      .collection("vocab")
      .doc(vocabOne)
      .set(vocabDataOne);
    await firestore
      .collection("sets")
      .doc(setTwo)
      .collection("vocab")
      .doc(vocabTwo)
      .set(vocabDataTwo);

    const requestData = {
      switch_language: false,
      sets: [setTwo],
      mode: "questions",
      limit: 2,
    };

    firebase.assertFails(createProgress(requestData));
  });

  it("processAnswer updates progress documents appropriately when correct and incorrect answers provided", async () => {
    const processAnswer = test.wrap(cloudFunctions.processAnswer);

    const progressData = {
      correct: [],
      current_correct: [],
      duration: null,
      incorrect: [],
      progress: 0,
      questions: [progressVocabOne, progressVocabTwo],
      set_title: setOne,
      set_titles: [setOne],
      start_time: 1627308670962,
      switch_language: false,
      uid: userOne,
      mode: "questions",
      typo: false,
      setIds: [setOne],
    };
    const termDataOne = {
      item: termOne,
    };
    const termDataTwo = {
      item: termTwo,
    };
    const definitionDataOne = {
      item: definitionOne,
    };
    const definitionDataTwo = {
      item: definitionTwo,
    };

    const progressId = "progress_01";
    const progressDocId = firestore.collection("progress").doc(progressId);

    await progressDocId.set(progressData);
    await progressDocId
      .collection("terms")
      .doc(progressVocabOne)
      .set(termDataOne);
    await progressDocId
      .collection("terms")
      .doc(progressVocabTwo)
      .set(termDataTwo);
    await progressDocId
      .collection("definitions")
      .doc(progressVocabOne)
      .set(definitionDataOne);
    await progressDocId
      .collection("definitions")
      .doc(progressVocabTwo)
      .set(definitionDataTwo);

    const firstTermAnswerRequestData = {
      progressId: progressId,
      answer: definitionOne,
    };
    const secondTermAnswerRequestData = {
      progressId: progressId,
      answer: definitionTwo,
    };
    const incorrectAnswerRequestData = {
      progressId: progressId,
      answer: incorrectAnswer,
    };

    const firstReturn = await processAnswer(incorrectAnswerRequestData);

    hamjest.assertThat(
      firstReturn,
      hamjest.anyOf(
        hamjest.is({
          mode: "questions",
          correct: false,
          correctAnswers: [definitionOne],
          currentVocabId: progressVocabOne,
          moreAnswers: false,
          nextPrompt: {
            item: termOne,
            set_owner: userOne,
          },
          progress: 1,
          totalQuestions: 3,
          totalCorrect: 0,
          totalIncorrect: 1,
          typo: false,
        }),
        hamjest.is({
          mode: "questions",
          correct: false,
          correctAnswers: [definitionOne],
          currentVocabId: progressVocabOne,
          moreAnswers: false,
          nextPrompt: {
            item: termTwo,
            set_owner: userOne,
          },
          progress: 1,
          totalQuestions: 3,
          totalCorrect: 0,
          totalIncorrect: 1,
          typo: false,
        })
      )
    );

    const snapAfterIncorrectData = await progressDocId
      .get()
      .then((doc) => doc.data());

    hamjest.assertThat(
      snapAfterIncorrectData,
      hamjest.anyOf(
        hamjest.is({
          correct: [],
          current_correct: [],
          duration: null,
          incorrect: [progressVocabOne],
          progress: 1,
          questions: [progressVocabOne, progressVocabOne, progressVocabTwo],
          set_title: setOne,
          set_titles: [setOne],
          start_time: 1627308670962,
          switch_language: false,
          uid: userOne,
          mode: "questions",
          typo: false,
          setIds: [setOne],
        }),
        hamjest.is({
          correct: [],
          current_correct: [],
          duration: null,
          incorrect: [progressVocabOne],
          progress: 1,
          questions: [progressVocabOne, progressVocabTwo, progressVocabOne],
          set_title: setOne,
          set_titles: [setOne],
          start_time: 1627308670962,
          switch_language: false,
          uid: userOne,
          mode: "questions",
          typo: false,
          setIds: [setOne],
        })
      )
    );

    if (firstReturn.nextPrompt.item === termOne) {
      await processAnswer(firstTermAnswerRequestData);
      await processAnswer(secondTermAnswerRequestData);
    } else {
      await processAnswer(secondTermAnswerRequestData);
      await processAnswer(firstTermAnswerRequestData);
    }

    const snapAfterCorrectData = await progressDocId
      .get()
      .then((doc) => doc.data());

    hamjest.assertThat(
      snapAfterCorrectData.correct,
      hamjest.anyOf(
        hamjest.is([progressVocabOne, progressVocabTwo]),
        hamjest.is([progressVocabTwo, progressVocabOne])
      )
    );
    hamjest.assertThat(
      snapAfterCorrectData.questions,
      hamjest.anyOf(
        hamjest.is([progressVocabOne, progressVocabOne, progressVocabTwo]),
        hamjest.is([progressVocabOne, progressVocabTwo, progressVocabOne])
      )
    );
    assert.deepStrictEqual(snapAfterCorrectData.incorrect, [progressVocabOne]);
    assert.deepStrictEqual(snapAfterCorrectData.current_correct, []);
    assert.notStrictEqual(snapAfterCorrectData.duration, null);
    assert.strictEqual(snapAfterCorrectData.progress, 3);
    assert.strictEqual(snapAfterCorrectData.set_title, setOne);
    assert.deepStrictEqual(snapAfterCorrectData.set_titles, [setOne]);
    assert.strictEqual(snapAfterCorrectData.start_time, 1627308670962);
    assert.strictEqual(snapAfterCorrectData.switch_language, false);
    assert.strictEqual(snapAfterCorrectData.uid, userOne);
    assert.strictEqual(snapAfterCorrectData.mode, "questions");
    assert.strictEqual(snapAfterCorrectData.typo, false);
  });

  it("processAnswer returns correct data", async () => {
    const processAnswer = test.wrap(cloudFunctions.processAnswer);

    const progressData = {
      correct: [],
      current_correct: [],
      duration: null,
      incorrect: [],
      progress: 0,
      questions: [progressVocabOne],
      set_title: setOne,
      set_titles: [setOne],
      start_time: 1627308670962,
      switch_language: false,
      uid: userOne,
      mode: "questions",
      typo: false,
      setIds: [setOne],
    };
    const termDataOne = {
      item: termOne,
    };
    const definitionDataOne = {
      item: definitionOne,
    };

    const progressId = "progress_01";
    const progressDocId = firestore.collection("progress").doc(progressId);

    await progressDocId.set(progressData);
    await progressDocId
      .collection("terms")
      .doc(progressVocabOne)
      .set(termDataOne);
    await progressDocId
      .collection("definitions")
      .doc(progressVocabOne)
      .set(definitionDataOne);

    const correctAnswerRequestData = {
      progressId: progressId,
      answer: definitionOne,
    };
    const incorrectAnswerRequestData = {
      progressId: progressId,
      answer: incorrectAnswer,
    };

    const returnAfterIncorrect = await processAnswer(
      incorrectAnswerRequestData
    );
    const returnAfterCorrect = await processAnswer(correctAnswerRequestData);

    assert.deepStrictEqual(returnAfterIncorrect, {
      mode: "questions",
      correct: false,
      correctAnswers: [definitionOne],
      currentVocabId: progressVocabOne,
      moreAnswers: false,
      nextPrompt: {
        item: termOne,
        set_owner: userOne,
      },
      progress: 1,
      totalQuestions: 2,
      totalCorrect: 0,
      totalIncorrect: 1,
      typo: false,
    });

    assert.strictEqual(returnAfterCorrect.mode, "questions");
    assert.strictEqual(returnAfterCorrect.correct, true);
    assert.deepStrictEqual(returnAfterCorrect.correctAnswers, [definitionOne]);
    assert.strictEqual(returnAfterCorrect.currentVocabId, progressVocabOne);
    assert.notStrictEqual(returnAfterCorrect.duration, null);
    assert.deepStrictEqual(returnAfterCorrect.incorrectAnswers, [
      progressVocabOne,
    ]);
    assert.strictEqual(returnAfterCorrect.moreAnswers, false);
    assert.strictEqual(returnAfterCorrect.nextPrompt, null);
    assert.strictEqual(returnAfterCorrect.progress, 2);
    assert.strictEqual(returnAfterCorrect.totalQuestions, 2);
    assert.strictEqual(returnAfterCorrect.totalCorrect, 1);
    assert.strictEqual(returnAfterCorrect.totalIncorrect, 1);
    assert.strictEqual(returnAfterCorrect.mode, "questions");
  });

  it("processAnswer correctly handles correct and incorrect inputted answers when a vocab term has multiple required answers", async () => {
    const processAnswer = test.wrap(cloudFunctions.processAnswer);

    const progressData = {
      correct: [],
      duration: null,
      incorrect: [],
      current_correct: [],
      progress: 0,
      questions: [progressVocabOne, progressVocabTwo],
      set_title: setOne,
      set_titles: [setOne],
      start_time: 1627308670962,
      switch_language: false,
      uid: userOne,
      mode: "questions",
      typo: false,
      setIds: [setOne],
    };
    const termDataOne = {
      item: termOne,
    };
    const termDataTwo = {
      item: termTwo,
    };
    const definitionDataOne = {
      item: doubleDefinitionOne,
    };
    const definitionDataTwo = {
      item: doubleDefinitionTwo,
    };

    const progressId = "progress_01";
    const progressDocId = firestore.collection("progress").doc(progressId);

    await progressDocId.set(progressData);
    await progressDocId
      .collection("terms")
      .doc(progressVocabOne)
      .set(termDataOne);
    await progressDocId
      .collection("terms")
      .doc(progressVocabTwo)
      .set(termDataTwo);
    await progressDocId
      .collection("definitions")
      .doc(progressVocabOne)
      .set(definitionDataOne);
    await progressDocId
      .collection("definitions")
      .doc(progressVocabTwo)
      .set(definitionDataTwo);

    const firstTermAnswerOneRequestData = {
      progressId: progressId,
      answer: "definition",
    };
    const firstTermAnswerTwoRequestData = {
      progressId: progressId,
      answer: "01",
    };
    const secondTermAnswerOneRequestData = {
      progressId: progressId,
      answer: "definition",
    };
    const secondTermAnswerTwoRequestData = {
      progressId: progressId,
      answer: "02",
    };
    const incorrectAnswerRequestData = {
      progressId: progressId,
      answer: incorrectAnswer,
    };

    const returnAfterCorrect = await processAnswer(
      firstTermAnswerOneRequestData
    );

    assert.deepStrictEqual(returnAfterCorrect, {
      mode: "questions",
      correct: true,
      correctAnswers: ["definition"],
      currentVocabId: progressVocabOne,
      moreAnswers: true,
      nextPrompt: null,
      progress: 0,
      totalQuestions: 2,
      totalCorrect: 0,
      totalIncorrect: 0,
      typo: false,
    });

    const snapAfterTermOneAnswerOneData = await progressDocId
      .get()
      .then((doc) => doc.data());

    assert.deepStrictEqual(snapAfterTermOneAnswerOneData, {
      correct: [],
      current_correct: ["definition"],
      duration: null,
      incorrect: [],
      progress: 0,
      questions: [progressVocabOne, progressVocabTwo],
      set_title: setOne,
      set_titles: [setOne],
      start_time: 1627308670962,
      switch_language: false,
      uid: userOne,
      mode: "questions",
      typo: false,
      setIds: [setOne],
    });

    const returnAfterIncorrect = await processAnswer(
      incorrectAnswerRequestData
    );

    const snapAfterIncorrectData = await progressDocId
      .get()
      .then((doc) => doc.data());

    hamjest.assertThat(
      snapAfterIncorrectData,
      hamjest.anyOf(
        hamjest.is({
          correct: [],
          current_correct: [],
          duration: null,
          incorrect: [progressVocabOne],
          progress: 1,
          questions: [progressVocabOne, progressVocabOne, progressVocabTwo],
          set_title: setOne,
          set_titles: [setOne],
          start_time: 1627308670962,
          switch_language: false,
          uid: userOne,
          mode: "questions",
          typo: false,
          setIds: [setOne],
        }),
        hamjest.is({
          correct: [],
          current_correct: [],
          duration: null,
          incorrect: [progressVocabOne],
          progress: 1,
          questions: [progressVocabOne, progressVocabTwo, progressVocabOne],
          set_title: setOne,
          set_titles: [setOne],
          start_time: 1627308670962,
          switch_language: false,
          uid: userOne,
          mode: "questions",
          typo: false,
          setIds: [setOne],
        })
      )
    );

    if (returnAfterIncorrect.nextPrompt.item === termOne) {
      await processAnswer(firstTermAnswerOneRequestData);
      await processAnswer(firstTermAnswerTwoRequestData);
      await processAnswer(secondTermAnswerOneRequestData);
      await processAnswer(secondTermAnswerTwoRequestData);
    } else {
      await processAnswer(secondTermAnswerOneRequestData);
      await processAnswer(secondTermAnswerTwoRequestData);
      await processAnswer(firstTermAnswerOneRequestData);
      await processAnswer(firstTermAnswerTwoRequestData);
    }

    const snapAfterCorrectData = await progressDocId
      .get()
      .then((doc) => doc.data());

    hamjest.assertThat(
      snapAfterCorrectData.correct,
      hamjest.anyOf(
        hamjest.is([progressVocabOne, progressVocabTwo]),
        hamjest.is([progressVocabTwo, progressVocabOne])
      )
    );
    hamjest.assertThat(
      snapAfterCorrectData.questions,
      hamjest.anyOf(
        hamjest.is([progressVocabOne, progressVocabOne, progressVocabTwo]),
        hamjest.is([progressVocabOne, progressVocabTwo, progressVocabOne])
      )
    );
    assert.deepStrictEqual(snapAfterCorrectData.incorrect, [progressVocabOne]);
    assert.deepStrictEqual(snapAfterCorrectData.current_correct, []);
    assert.notStrictEqual(snapAfterCorrectData.duration, null);
    assert.strictEqual(snapAfterCorrectData.progress, 3);
    assert.strictEqual(snapAfterCorrectData.set_title, setOne);
    assert.deepStrictEqual(snapAfterCorrectData.set_titles, [setOne]);
    assert.strictEqual(snapAfterCorrectData.start_time, 1627308670962);
    assert.strictEqual(snapAfterCorrectData.switch_language, false);
    assert.strictEqual(snapAfterCorrectData.uid, userOne);
    assert.strictEqual(snapAfterCorrectData.mode, "questions");
    assert.strictEqual(snapAfterCorrectData.typo, false);
  });

  it("processAnswer ignores punctuation", async () => {
    const processAnswer = test.wrap(cloudFunctions.processAnswer);

    const progressData = {
      correct: [],
      current_correct: [],
      duration: null,
      incorrect: [],
      progress: 0,
      questions: [progressVocabOne, progressVocabTwo],
      set_title: setOne,
      set_titles: [setOne],
      start_time: 1627308670962,
      switch_language: false,
      uid: userOne,
      mode: "questions",
      typo: false,
      setIds: [setOne],
    };
    const termDataOne = {
      item: termOne,
    };
    const termDataTwo = {
      item: termTwo,
    };
    const definitionDataOne = {
      item: punctuationDefinitionOne,
    };
    const definitionDataTwo = {
      item: definitionTwo,
    };

    const progressId = "progress_01";
    const progressDocId = firestore.collection("progress").doc(progressId);

    await progressDocId.set(progressData);
    await progressDocId
      .collection("terms")
      .doc(progressVocabOne)
      .set(termDataOne);
    await progressDocId
      .collection("terms")
      .doc(progressVocabTwo)
      .set(termDataTwo);
    await progressDocId
      .collection("definitions")
      .doc(progressVocabOne)
      .set(definitionDataOne);
    await progressDocId
      .collection("definitions")
      .doc(progressVocabTwo)
      .set(definitionDataTwo);

    const requestData = {
      progressId: progressId,
      answer: "definition\"'_-)(,.0 1",
    };

    const returnedData = await processAnswer(requestData);

    assert.equal(returnedData.correct, true);
  });

  it("processAnswer detects typo correctly for slightly wrong short answer - Levenshtein distance 1", async () => {
    const processAnswer = test.wrap(cloudFunctions.processAnswer);

    const progressData = {
      correct: [],
      current_correct: [],
      duration: null,
      incorrect: [],
      progress: 0,
      questions: [progressVocabOne],
      set_title: setOne,
      set_titles: [setOne],
      start_time: 1627308670962,
      switch_language: false,
      uid: userOne,
      mode: "questions",
      typo: false,
      setIds: [setOne],
    };
    const termDataOne = {
      item: termOne,
    };
    const definitionDataOne = {
      item: shortDefinitionOne,
    };

    const progressId = "progress_01";
    const progressDocId = firestore.collection("progress").doc(progressId);

    await progressDocId.set(progressData);
    await progressDocId
      .collection("terms")
      .doc(progressVocabOne)
      .set(termDataOne);
    await progressDocId
      .collection("definitions")
      .doc(progressVocabOne)
      .set(definitionDataOne);

    const typoOneAnswerRequestData = {
      progressId: progressId,
      answer: shortDefinitionOneTypoOne,
    };

    const returnedData = await processAnswer(typoOneAnswerRequestData);

    assert.deepStrictEqual(returnedData, {
      typo: true,
    });
  });

  it("processAnswer doesn't detect typo for short answer with too many mistakes - Levenshtein distance 2", async () => {
    const processAnswer = test.wrap(cloudFunctions.processAnswer);

    const progressData = {
      correct: [],
      current_correct: [],
      duration: null,
      incorrect: [],
      progress: 0,
      questions: [progressVocabOne],
      set_title: setOne,
      set_titles: [setOne],
      start_time: 1627308670962,
      switch_language: false,
      uid: userOne,
      mode: "questions",
      typo: false,
      setIds: [setOne],
    };
    const termDataOne = {
      item: termOne,
    };
    const definitionDataOne = {
      item: shortDefinitionOne,
    };

    const progressId = "progress_01";
    const progressDocId = firestore.collection("progress").doc(progressId);

    await progressDocId.set(progressData);
    await progressDocId
      .collection("terms")
      .doc(progressVocabOne)
      .set(termDataOne);
    await progressDocId
      .collection("definitions")
      .doc(progressVocabOne)
      .set(definitionDataOne);

    const typoTwoAnswerRequestData = {
      progressId: progressId,
      answer: shortDefinitionOneTypoTwo,
    };

    const returnedData = await processAnswer(typoTwoAnswerRequestData);

    assert.equal(returnedData.typo, false);
  });

  it("processAnswer detects typo correctly for slightly wrong long answer - Levenshtein distance 1", async () => {
    const processAnswer = test.wrap(cloudFunctions.processAnswer);

    const progressData = {
      correct: [],
      current_correct: [],
      duration: null,
      incorrect: [],
      progress: 0,
      questions: [progressVocabOne],
      set_title: setOne,
      set_titles: [setOne],
      start_time: 1627308670962,
      switch_language: false,
      uid: userOne,
      mode: "questions",
      typo: false,
      setIds: [setOne],
    };
    const termDataOne = {
      item: termOne,
    };
    const definitionDataOne = {
      item: definitionOne,
    };

    const progressId = "progress_01";
    const progressDocId = firestore.collection("progress").doc(progressId);

    await progressDocId.set(progressData);
    await progressDocId
      .collection("terms")
      .doc(progressVocabOne)
      .set(termDataOne);
    await progressDocId
      .collection("definitions")
      .doc(progressVocabOne)
      .set(definitionDataOne);

    const typoOneAnswerRequestData = {
      progressId: progressId,
      answer: definitionOneTypoOne,
    };

    const returnedData = await processAnswer(typoOneAnswerRequestData);

    assert.deepStrictEqual(returnedData, {
      typo: true,
    });
  });

  it("processAnswer detects typo correctly for slightly wrong long answer - Levenshtein distance 2", async () => {
    const processAnswer = test.wrap(cloudFunctions.processAnswer);

    const progressData = {
      correct: [],
      current_correct: [],
      duration: null,
      incorrect: [],
      progress: 0,
      questions: [progressVocabOne],
      set_title: setOne,
      set_titles: [setOne],
      start_time: 1627308670962,
      switch_language: false,
      uid: userOne,
      mode: "questions",
      typo: false,
      setIds: [setOne],
    };
    const termDataOne = {
      item: termOne,
    };
    const definitionDataOne = {
      item: definitionOne,
    };

    const progressId = "progress_01";
    const progressDocId = firestore.collection("progress").doc(progressId);

    await progressDocId.set(progressData);
    await progressDocId
      .collection("terms")
      .doc(progressVocabOne)
      .set(termDataOne);
    await progressDocId
      .collection("definitions")
      .doc(progressVocabOne)
      .set(definitionDataOne);

    const typoTwoAnswerRequestData = {
      progressId: progressId,
      answer: definitionOneTypoTwo,
    };

    const returnedData = await processAnswer(typoTwoAnswerRequestData);

    assert.deepStrictEqual(returnedData, {
      typo: true,
    });
  });

  it("processAnswer detects typo correctly for slightly wrong long answer - Levenshtein distance 3", async () => {
    const processAnswer = test.wrap(cloudFunctions.processAnswer);

    const progressData = {
      correct: [],
      current_correct: [],
      duration: null,
      incorrect: [],
      progress: 0,
      questions: [progressVocabOne],
      set_title: setOne,
      set_titles: [setOne],
      start_time: 1627308670962,
      switch_language: false,
      uid: userOne,
      mode: "questions",
      typo: false,
      setIds: [setOne],
    };
    const termDataOne = {
      item: termOne,
    };
    const definitionDataOne = {
      item: definitionOne,
    };

    const progressId = "progress_01";
    const progressDocId = firestore.collection("progress").doc(progressId);

    await progressDocId.set(progressData);
    await progressDocId
      .collection("terms")
      .doc(progressVocabOne)
      .set(termDataOne);
    await progressDocId
      .collection("definitions")
      .doc(progressVocabOne)
      .set(definitionDataOne);

    const typoThreeAnswerRequestData = {
      progressId: progressId,
      answer: definitionOneTypoThree,
    };

    const returnedData = await processAnswer(typoThreeAnswerRequestData);

    assert.deepStrictEqual(returnedData, {
      typo: true,
    });
  });

  it("processAnswer doesn't detect typo for long answer with too many mistakes - Levenshtein distance 4", async () => {
    const processAnswer = test.wrap(cloudFunctions.processAnswer);

    const progressData = {
      correct: [],
      current_correct: [],
      duration: null,
      incorrect: [],
      progress: 0,
      questions: [progressVocabOne],
      set_title: setOne,
      set_titles: [setOne],
      start_time: 1627308670962,
      switch_language: false,
      uid: userOne,
      mode: "questions",
      typo: false,
      setIds: [setOne],
    };
    const termDataOne = {
      item: termOne,
    };
    const definitionDataOne = {
      item: definitionOne,
    };

    const progressId = "progress_01";
    const progressDocId = firestore.collection("progress").doc(progressId);

    await progressDocId.set(progressData);
    await progressDocId
      .collection("terms")
      .doc(progressVocabOne)
      .set(termDataOne);
    await progressDocId
      .collection("definitions")
      .doc(progressVocabOne)
      .set(definitionDataOne);

    const typoFourAnswerRequestData = {
      progressId: progressId,
      answer: definitionOneTypoFour,
    };

    const returnedData = await processAnswer(typoFourAnswerRequestData);

    assert.equal(returnedData.typo, false);
  });

  it("processAnswer detects typo correctly for empty answer", async () => {
    const processAnswer = test.wrap(cloudFunctions.processAnswer);

    const progressData = {
      correct: [],
      current_correct: [],
      duration: null,
      incorrect: [],
      progress: 0,
      questions: [progressVocabOne],
      set_title: setOne,
      set_titles: [setOne],
      start_time: 1627308670962,
      switch_language: false,
      uid: userOne,
      mode: "questions",
      typo: false,
      setIds: [setOne],
    };
    const termDataOne = {
      item: termOne,
    };
    const definitionDataOne = {
      item: definitionOne,
    };

    const progressId = "progress_01";
    const progressDocId = firestore.collection("progress").doc(progressId);

    await progressDocId.set(progressData);
    await progressDocId
      .collection("terms")
      .doc(progressVocabOne)
      .set(termDataOne);
    await progressDocId
      .collection("definitions")
      .doc(progressVocabOne)
      .set(definitionDataOne);

    const emptyAnswerRequestData = {
      progressId: progressId,
      answer: "",
    };

    const returnedData = await processAnswer(emptyAnswerRequestData);

    assert.deepStrictEqual(returnedData, {
      typo: true,
    });
  });

  it("processAnswer stores correct typo status in progress db collection when typo detected", async () => {
    const processAnswer = test.wrap(cloudFunctions.processAnswer);

    const progressData = {
      correct: [],
      current_correct: [],
      duration: null,
      incorrect: [],
      progress: 0,
      questions: [progressVocabOne],
      set_title: setOne,
      set_titles: [setOne],
      start_time: 1627308670962,
      switch_language: false,
      uid: userOne,
      mode: "questions",
      typo: false,
      setIds: [setOne],
    };
    const termDataOne = {
      item: termOne,
    };
    const definitionDataOne = {
      item: definitionOne,
    };

    const progressId = "progress_01";
    const progressDocId = firestore.collection("progress").doc(progressId);

    await progressDocId.set(progressData);
    await progressDocId
      .collection("terms")
      .doc(progressVocabOne)
      .set(termDataOne);
    await progressDocId
      .collection("definitions")
      .doc(progressVocabOne)
      .set(definitionDataOne);

    const typoOneAnswerRequestData = {
      progressId: progressId,
      answer: definitionOneTypoOne,
    };

    await processAnswer(typoOneAnswerRequestData);

    const snapAfter = await progressDocId.get().then((doc) => doc.data());

    assert.strictEqual(snapAfter.typo, true);
  });

  it("processAnswer marks an answer as wrong on the second typo (typo - Levenshtein distance 1)", async () => {
    const processAnswer = test.wrap(cloudFunctions.processAnswer);

    const progressData = {
      correct: [],
      current_correct: [],
      duration: null,
      incorrect: [],
      progress: 0,
      questions: [progressVocabOne],
      set_title: setOne,
      set_titles: [setOne],
      start_time: 1627308670962,
      switch_language: false,
      uid: userOne,
      mode: "questions",
      typo: true,
      setIds: [setOne],
    };
    const termDataOne = {
      item: termOne,
    };
    const definitionDataOne = {
      item: definitionOne,
    };

    const progressId = "progress_01";
    const progressDocId = firestore.collection("progress").doc(progressId);

    await progressDocId.set(progressData);
    await progressDocId
      .collection("terms")
      .doc(progressVocabOne)
      .set(termDataOne);
    await progressDocId
      .collection("definitions")
      .doc(progressVocabOne)
      .set(definitionDataOne);

    const typoOneAnswerRequestData = {
      progressId: progressId,
      answer: definitionOneTypoOne,
    };

    const returnedData = await processAnswer(typoOneAnswerRequestData);

    assert.equal(returnedData.correct, false);

    const snapAfter = await progressDocId.get().then((doc) => doc.data());

    assert.strictEqual(snapAfter.typo, false);
  });

  it("processAnswer marks an answer as wrong on the second typo (empty answer)", async () => {
    const processAnswer = test.wrap(cloudFunctions.processAnswer);

    const progressData = {
      correct: [],
      current_correct: [],
      duration: null,
      incorrect: [],
      progress: 0,
      questions: [progressVocabOne],
      set_title: setOne,
      set_titles: [setOne],
      start_time: 1627308670962,
      switch_language: false,
      uid: userOne,
      mode: "questions",
      typo: true,
      setIds: [setOne],
    };
    const termDataOne = {
      item: termOne,
    };
    const definitionDataOne = {
      item: definitionOne,
    };

    const progressId = "progress_01";
    const progressDocId = firestore.collection("progress").doc(progressId);

    await progressDocId.set(progressData);
    await progressDocId
      .collection("terms")
      .doc(progressVocabOne)
      .set(termDataOne);
    await progressDocId
      .collection("definitions")
      .doc(progressVocabOne)
      .set(definitionDataOne);

    const emptyAnswerRequestData = {
      progressId: progressId,
      answer: "",
    };

    const returnedData = await processAnswer(emptyAnswerRequestData);

    assert.equal(returnedData.correct, false);

    const snapAfter = await progressDocId.get().then((doc) => doc.data());

    assert.strictEqual(snapAfter.typo, false);
  });

  it("processAnswer stores correct data in completed_progress db collection on test completion (set combination never tested before)", async () => {
    const processAnswer = test.wrap(cloudFunctions.processAnswer);

    await firestore
      .collection("completed_progress")
      .doc(`${setOne}__${setTwo}`)
      .delete();

    const progressData = {
      correct: [],
      current_correct: [],
      duration: null,
      incorrect: [],
      progress: 0,
      questions: [progressVocabOne],
      set_title: `${setOne}__${setTwo}`,
      set_titles: [setOne, setTwo],
      start_time: 1627308670962,
      switch_language: false,
      uid: userOne,
      mode: "questions",
      typo: false,
      setIds: [setOne, setTwo],
    };
    const termDataOne = {
      item: termOne,
    };
    const definitionDataOne = {
      item: definitionOne,
    };

    const progressId = "progress_01";
    const progressDocId = firestore.collection("progress").doc(progressId);
    const completedProgressDocId = firestore
      .collection("completed_progress")
      .doc(`${setOne}__${setTwo}`);

    await progressDocId.set(progressData);
    await progressDocId
      .collection("terms")
      .doc(progressVocabOne)
      .set(termDataOne);
    await progressDocId
      .collection("definitions")
      .doc(progressVocabOne)
      .set(definitionDataOne);

    const requestData = {
      progressId: progressId,
      answer: definitionOne,
    };

    await processAnswer(requestData);

    const completedProgressSnapAfter = await completedProgressDocId
      .get()
      .then((doc) => doc.data());

    assert.deepStrictEqual(completedProgressSnapAfter, {
      attempts: 1,
      total_percentage: 100,
      set_title: `${setOne} & ${setTwo}`,
    });
  });

  it("processAnswer stores correct data in completed_progress db collection on test completion (set combination has been tested previously)", async () => {
    const processAnswer = test.wrap(cloudFunctions.processAnswer);

    await firestore
      .collection("completed_progress")
      .doc(`${setOne}__${setTwo}`)
      .delete();

    const progressData = {
      correct: [],
      current_correct: [],
      duration: null,
      incorrect: [],
      progress: 0,
      questions: [progressVocabOne],
      set_title: `${setOne}__${setTwo}`,
      set_titles: [setOne, setTwo],
      start_time: 1627308670962,
      switch_language: false,
      uid: userOne,
      mode: "questions",
      typo: false,
      setIds: [setOne, setTwo],
    };
    const completedProgressData = {
      attempts: 1,
      total_percentage: 0,
      set_title: `${setOne} & ${setTwo}`,
    };
    const termDataOne = {
      item: termOne,
    };
    const definitionDataOne = {
      item: definitionOne,
    };

    const progressId = "progress_01";
    const progressDocId = firestore.collection("progress").doc(progressId);
    const completedProgressDocId = firestore
      .collection("completed_progress")
      .doc(`${setOne}__${setTwo}`);

    await progressDocId.set(progressData);
    await completedProgressDocId.set(completedProgressData);
    await progressDocId
      .collection("terms")
      .doc(progressVocabOne)
      .set(termDataOne);
    await progressDocId
      .collection("definitions")
      .doc(progressVocabOne)
      .set(definitionDataOne);

    const requestData = {
      progressId: progressId,
      answer: definitionOne,
    };

    await processAnswer(requestData);

    const completedProgressSnapAfter = await completedProgressDocId
      .get()
      .then((doc) => doc.data());

    assert.deepStrictEqual(completedProgressSnapAfter, {
      attempts: 2,
      total_percentage: 100,
      set_title: `${setOne} & ${setTwo}`,
    });
  });

  it("processAnswer stores correct data in incorrect_answers db collection on incorrect answer (without typo and when not a member of any groups)", async () => {
    const processAnswer = test.wrap(cloudFunctions.processAnswer);

    await deleteCollection(firestore, `/users/${userOne}/groups`, 500);
    await deleteCollection(firestore, `/incorrect_answers`, 500);

    const progressData = {
      correct: [],
      current_correct: [],
      duration: null,
      incorrect: [],
      progress: 0,
      questions: [progressVocabOne],
      set_title: setOne,
      set_titles: [setOne],
      start_time: 1627308670962,
      switch_language: false,
      uid: userOne,
      mode: "questions",
      typo: false,
      setIds: [setOne],
    };
    const termDataOne = {
      item: termOne,
    };
    const definitionDataOne = {
      item: definitionOne,
    };

    const progressId = "progress_01";
    const progressDocId = firestore.collection("progress").doc(progressId);

    await progressDocId.set(progressData);
    await progressDocId
      .collection("terms")
      .doc(progressVocabOne)
      .set(termDataOne);
    await progressDocId
      .collection("definitions")
      .doc(progressVocabOne)
      .set(definitionDataOne);

    const incorrectAnswerRequestData = {
      progressId: progressId,
      answer: incorrectAnswer,
    };

    await processAnswer(incorrectAnswerRequestData);

    const snapAfter = await firestore
      .collection("incorrect_answers")
      .get()
      .then((querySnapshot) => querySnapshot.docs[0].data());

    assert.deepStrictEqual(snapAfter, {
      groups: [],
      term: termOne,
      definition: definitionOne,
      uid: userOne,
      switch_language: false,
      answer: incorrectAnswer,
      setIds: [setOne],
      set_titles: [setOne],
    });
  });

  it("processAnswer stores correct data in incorrect_answers db collection on incorrect answer (without typo and when a member of groups)", async () => {
    const processAnswer = test.wrap(cloudFunctions.processAnswer);

    await deleteCollection(firestore, `/users/${userOne}/groups`, 500);
    await deleteCollection(firestore, `/incorrect_answers`, 500);

    const progressData = {
      correct: [],
      current_correct: [],
      duration: null,
      incorrect: [],
      progress: 0,
      questions: [progressVocabOne],
      set_title: setOne,
      set_titles: [setOne],
      start_time: 1627308670962,
      switch_language: false,
      uid: userOne,
      mode: "questions",
      typo: false,
      setIds: [setOne],
    };
    const groupOneData = {
      role: "owner",
    };
    const groupTwoData = {
      role: "contributor",
    };
    const termDataOne = {
      item: termOne,
    };
    const definitionDataOne = {
      item: definitionOne,
    };

    const progressId = "progress_01";
    const progressDocId = firestore.collection("progress").doc(progressId);
    const userGroupsCollectionId = firestore
      .collection("users")
      .doc(userOne)
      .collection("groups");

    await progressDocId.set(progressData);
    await userGroupsCollectionId.doc(groupOne).set(groupOneData);
    await userGroupsCollectionId.doc(groupTwo).set(groupTwoData);
    await progressDocId
      .collection("terms")
      .doc(progressVocabOne)
      .set(termDataOne);
    await progressDocId
      .collection("definitions")
      .doc(progressVocabOne)
      .set(definitionDataOne);

    const incorrectAnswerRequestData = {
      progressId: progressId,
      answer: incorrectAnswer,
    };

    await processAnswer(incorrectAnswerRequestData);

    const snapAfter = await firestore
      .collection("incorrect_answers")
      .get()
      .then((querySnapshot) => querySnapshot.docs[0].data());

    assert.deepStrictEqual(snapAfter, {
      groups: [groupOne, groupTwo],
      term: termOne,
      definition: definitionOne,
      uid: userOne,
      switch_language: false,
      answer: incorrectAnswer,
      setIds: [setOne],
      set_titles: [setOne],
    });
  });

  it("processAnswer stores no additional data in incorrect_answers db collection when typo detected", async () => {
    const processAnswer = test.wrap(cloudFunctions.processAnswer);

    await deleteCollection(firestore, `/incorrect_answers`, 500);

    const progressData = {
      correct: [],
      current_correct: [],
      duration: null,
      incorrect: [],
      progress: 0,
      questions: [progressVocabOne],
      set_title: setOne,
      set_titles: [setOne],
      start_time: 1627308670962,
      switch_language: false,
      uid: userOne,
      mode: "questions",
      typo: false,
      setIds: [setOne],
    };
    const termDataOne = {
      item: termOne,
    };
    const definitionDataOne = {
      item: definitionOne,
    };

    const progressId = "progress_01";
    const progressDocId = firestore.collection("progress").doc(progressId);

    await progressDocId.set(progressData);
    await progressDocId
      .collection("terms")
      .doc(progressVocabOne)
      .set(termDataOne);
    await progressDocId
      .collection("definitions")
      .doc(progressVocabOne)
      .set(definitionDataOne);

    const typoAnswerRequestData = {
      progressId: progressId,
      answer: definitionOneTypoOne,
    };

    await processAnswer(typoAnswerRequestData);

    const snapAfter = await firestore
      .collection("incorrect_answers")
      .get()
      .then((querySnapshot) => querySnapshot.docs);

    assert.deepStrictEqual(snapAfter, []);
  });

  it("processAnswer stores no additional data in incorrect_answers db collection when correct answer provided", async () => {
    const processAnswer = test.wrap(cloudFunctions.processAnswer);

    await deleteCollection(firestore, `/incorrect_answers`, 500);

    const progressData = {
      correct: [],
      current_correct: [],
      duration: null,
      incorrect: [],
      progress: 0,
      questions: [progressVocabOne],
      set_title: setOne,
      set_titles: [setOne],
      start_time: 1627308670962,
      switch_language: false,
      uid: userOne,
      mode: "questions",
      typo: false,
      setIds: [setOne],
    };
    const termDataOne = {
      item: termOne,
    };
    const definitionDataOne = {
      item: definitionOne,
    };

    const progressId = "progress_01";
    const progressDocId = firestore.collection("progress").doc(progressId);

    await progressDocId.set(progressData);
    await progressDocId
      .collection("terms")
      .doc(progressVocabOne)
      .set(termDataOne);
    await progressDocId
      .collection("definitions")
      .doc(progressVocabOne)
      .set(definitionDataOne);

    const requestData = {
      progressId: progressId,
      answer: definitionOne,
    };

    await processAnswer(requestData);

    const snapAfter = await firestore
      .collection("incorrect_answers")
      .get()
      .then((querySnapshot) => querySnapshot.docs);

    assert.deepStrictEqual(snapAfter, []);
  });

  it("setAdmin can change other users' admin states", async () => {
    const setAdmin = test.wrap(cloudFunctions.setAdmin);

    const targetId = await admin
      .auth()
      .createUser({
        email: "user_01@mgrove.uk",
        password: "user1234",
      })
      .then((user) => user.uid);

    firebase.assertSucceeds(
      await setAdmin({
        targetUser: targetId,
        adminState: true,
      })
    );

    await admin.auth().deleteUser(targetId);
  });

  it("setAdmin can't change current user's admin state", () => {
    const setAdmin = test.wrap(cloudFunctions.setAdmin);

    const targetId = "M3JPrFRH6Fdo8XMUbF0l2zVZUCH3";

    firebase.assertFails(
      setAdmin({
        targetUser: targetId,
        adminState: false,
      })
    );
  });

  it("addSetToGroup can add existing set to existing group", async () => {
    const addSetToGroup = test.wrap(cloudFunctions.addSetToGroup);

    const setDataOne = {
      owner: userOne,
      public: true,
      title: setOne,
    };
    const vocabDataOne = {
      term: termOne,
      definition: definitionOne,
    };
    const vocabDataTwo = {
      term: termTwo,
      definition: definitionTwo,
    };
    let groupUsers = {};
    groupUsers[userOne] = "owner";
    const groupDataOne = {
      display_name: groupOne,
      join_code: "abcd1234",
      sets: [],
      users: groupUsers,
    };
    const userGroupDataOne = {
      role: "owner",
    };

    await firestore.collection("sets").doc(setOne).set(setDataOne);
    await firestore
      .collection("sets")
      .doc(setOne)
      .collection("vocab")
      .doc(vocabOne)
      .set(vocabDataOne);
    await firestore
      .collection("sets")
      .doc(setOne)
      .collection("vocab")
      .doc(vocabTwo)
      .set(vocabDataTwo);
    await firestore.collection("groups").doc(groupOne).set(groupDataOne);
    await firestore
      .collection("users")
      .doc(userOne)
      .collection("groups")
      .doc(groupOne)
      .set(userGroupDataOne);

    firebase.assertSucceeds(
      addSetToGroup({
        groupId: groupOne,
        setId: setOne,
      })
    );
  });

  it("addSetToGroup can't add existing set that's not public and isn't theirs to existing group", async () => {
    const addSetToGroup = test.wrap(cloudFunctions.addSetToGroup);

    const setDataOne = {
      owner: userTwo,
      public: false,
      title: setOne,
    };
    const vocabDataOne = {
      term: termOne,
      definition: definitionOne,
    };
    const vocabDataTwo = {
      term: termTwo,
      definition: definitionTwo,
    };
    let groupUsers = {};
    groupUsers[userOne] = "owner";
    const groupDataOne = {
      display_name: groupOne,
      join_code: "abcd1234",
      sets: [],
      users: groupUsers,
    };
    const userGroupDataOne = {
      role: "owner",
    };

    await firestore.collection("sets").doc(setOne).set(setDataOne);
    await firestore
      .collection("sets")
      .doc(setOne)
      .collection("vocab")
      .doc(vocabOne)
      .set(vocabDataOne);
    await firestore
      .collection("sets")
      .doc(setOne)
      .collection("vocab")
      .doc(vocabTwo)
      .set(vocabDataTwo);
    await firestore.collection("groups").doc(groupOne).set(groupDataOne);
    await firestore
      .collection("users")
      .doc(userOne)
      .collection("groups")
      .doc(groupOne)
      .set(userGroupDataOne);

    firebase.assertFails(
      addSetToGroup({
        groupId: groupOne,
        setId: setOne,
      })
    );
  });

  it("addSetToGroup can't add existing set to existing group when their role is member and they aren't admin", async () => {
    const addSetToGroup = test.wrap(cloudFunctions.addSetToGroup);

    const setDataOne = {
      owner: userOne,
      public: true,
      title: setOne,
    };
    const vocabDataOne = {
      term: termOne,
      definition: definitionOne,
    };
    const vocabDataTwo = {
      term: termTwo,
      definition: definitionTwo,
    };
    let groupUsers = {};
    groupUsers[userOne] = "member";
    const groupDataOne = {
      display_name: groupOne,
      join_code: "abcd1234",
      sets: [],
      users: groupUsers,
    };
    const userGroupDataOne = {
      role: "member",
    };

    await firestore.collection("sets").doc(setOne).set(setDataOne);
    await firestore
      .collection("sets")
      .doc(setOne)
      .collection("vocab")
      .doc(vocabOne)
      .set(vocabDataOne);
    await firestore
      .collection("sets")
      .doc(setOne)
      .collection("vocab")
      .doc(vocabTwo)
      .set(vocabDataTwo);
    await firestore.collection("groups").doc(groupOne).set(groupDataOne);
    await firestore
      .collection("users")
      .doc(userOne)
      .collection("groups")
      .doc(groupOne)
      .set(userGroupDataOne);

    firebase.assertFails(
      addSetToGroup({
        groupId: groupOne,
        setId: setOne,
      })
    );
  });

  it("removeSetFromGroup can remove existing set from existing group it is already a part of when group owner", async () => {
    const removeSetFromGroup = test.wrap(cloudFunctions.removeSetFromGroup);

    const setDataOne = {
      owner: userOne,
      public: true,
      title: setOne,
      groups: [groupOne],
    };
    const vocabDataOne = {
      term: termOne,
      definition: definitionOne,
    };
    const vocabDataTwo = {
      term: termTwo,
      definition: definitionTwo,
    };
    let groupUsers = {};
    groupUsers[userOne] = "owner";
    const groupDataOne = {
      display_name: groupOne,
      join_code: "abcd1234",
      sets: [setOne],
      users: groupUsers,
    };
    const userGroupDataOne = {
      role: "owner",
    };

    await firestore.collection("sets").doc(setOne).set(setDataOne);
    await firestore
      .collection("sets")
      .doc(setOne)
      .collection("vocab")
      .doc(vocabOne)
      .set(vocabDataOne);
    await firestore
      .collection("sets")
      .doc(setOne)
      .collection("vocab")
      .doc(vocabTwo)
      .set(vocabDataTwo);
    await firestore.collection("groups").doc(groupOne).set(groupDataOne);
    await firestore
      .collection("users")
      .doc(userOne)
      .collection("groups")
      .doc(groupOne)
      .set(userGroupDataOne);

    firebase.assertSucceeds(
      removeSetFromGroup({
        groupId: groupOne,
        setId: setOne,
      })
    );
  });

  it("removeSetFromGroup can't remove existing set from existing group it is already a part of when not group owner", async () => {
    const removeSetFromGroup = test.wrap(cloudFunctions.removeSetFromGroup);

    const setDataOne = {
      owner: userOne,
      public: true,
      title: setOne,
      groups: [groupOne],
    };
    const vocabDataOne = {
      term: termOne,
      definition: definitionOne,
    };
    const vocabDataTwo = {
      term: termTwo,
      definition: definitionTwo,
    };
    let groupUsers = {};
    groupUsers[userOne] = "collaborator";
    const groupDataOne = {
      display_name: groupOne,
      join_code: "abcd1234",
      sets: [setOne],
      users: groupUsers,
    };
    const userGroupDataOne = {
      role: "collaborator",
    };

    await firestore.collection("sets").doc(setOne).set(setDataOne);
    await firestore
      .collection("sets")
      .doc(setOne)
      .collection("vocab")
      .doc(vocabOne)
      .set(vocabDataOne);
    await firestore
      .collection("sets")
      .doc(setOne)
      .collection("vocab")
      .doc(vocabTwo)
      .set(vocabDataTwo);
    await firestore.collection("groups").doc(groupOne).set(groupDataOne);
    await firestore
      .collection("users")
      .doc(userOne)
      .collection("groups")
      .doc(groupOne)
      .set(userGroupDataOne);

    firebase.assertFails(
      removeSetFromGroup({
        groupId: groupOne,
        setId: setOne,
      })
    );
  });

  it("removeSetFromGroup can't remove existing set from existing group it is not already a part of when group owner", async () => {
    const removeSetFromGroup = test.wrap(cloudFunctions.removeSetFromGroup);

    const setDataOne = {
      owner: userOne,
      public: true,
      title: setOne,
      groups: [],
    };
    const vocabDataOne = {
      term: termOne,
      definition: definitionOne,
    };
    const vocabDataTwo = {
      term: termTwo,
      definition: definitionTwo,
    };
    let groupUsers = {};
    groupUsers[userOne] = "owner";
    const groupDataOne = {
      display_name: groupOne,
      join_code: "abcd1234",
      sets: [],
      users: groupUsers,
    };
    const userGroupDataOne = {
      role: "owner",
    };

    await firestore.collection("sets").doc(setOne).set(setDataOne);
    await firestore
      .collection("sets")
      .doc(setOne)
      .collection("vocab")
      .doc(vocabOne)
      .set(vocabDataOne);
    await firestore
      .collection("sets")
      .doc(setOne)
      .collection("vocab")
      .doc(vocabTwo)
      .set(vocabDataTwo);
    await firestore.collection("groups").doc(groupOne).set(groupDataOne);
    await firestore
      .collection("users")
      .doc(userOne)
      .collection("groups")
      .doc(groupOne)
      .set(userGroupDataOne);

    firebase.assertFails(
      removeSetFromGroup({
        groupId: groupOne,
        setId: setOne,
      })
    );
  });

  it("createGroup can create new group", async () => {
    const createGroup = test.wrap(cloudFunctions.createGroup);

    const groupId = await createGroup(groupOne);
    const groupDocId = firestore.collection("groups").doc(groupId);

    await new Promise((res) => setTimeout(res, 1000));

    const snapGroupAfter = await groupDocId.get().then((doc) => doc.data());

    const userGroupDocId = firestore
      .collection("users")
      .doc(userOne)
      .collection("groups")
      .doc(groupId);
    const joinCodeDocId = firestore
      .collection("join_codes")
      .doc(snapGroupAfter.join_code);

    const snapUserGroupAfter = await userGroupDocId.get();
    const joinCodeSnap = await joinCodeDocId.get();

    assert.strictEqual(snapGroupAfter.display_name, groupOne);
    assert.deepStrictEqual(snapGroupAfter.sets, []);
    assert.deepStrictEqual(snapGroupAfter.users, {});
    assert.notStrictEqual(snapGroupAfter.join_code, null);

    assert.deepStrictEqual(snapUserGroupAfter.data(), {
      role: "owner",
    });

    assert.deepStrictEqual(joinCodeSnap.data(), {
      group: groupId,
    });
  });

  it("createProgressWithIncorrect correctly creates new progress record from progress record with incorrect answers in questions mode", async () => {
    const createProgressWithIncorrect = test.wrap(
      cloudFunctions.createProgressWithIncorrect
    );

    const vocabIdOne = `${setOne}__${vocabOne}`;
    const vocabIdTwo = `${setOne}__${vocabTwo}`;
    const vocabIdThree = `${setTwo}__${vocabThree}`;

    const progressData = {
      correct: [vocabIdTwo],
      incorrect: [vocabIdTwo, vocabIdTwo, vocabIdOne],
      questions: [vocabIdOne, vocabIdTwo, vocabIdThree],
      duration: null,
      progress: 1,
      start_time: 1627308670962,
      set_title: `${setOne} & ${setTwo}`,
      uid: userOne,
      switch_language: false,
      mode: "questions",
      current_correct: [],
      typo: false,
      setIds: [setOne, setTwo],
    };
    const termDataOne = {
      term: termOne,
    };
    const termDataTwo = {
      item: termTwo,
    };
    const termDataThree = {
      term: termThree,
    };
    const definitionDataOne = {
      item: definitionOne,
    };
    const definitionDataTwo = {
      item: definitionTwo,
    };
    const definitionDataThree = {
      item: definitionThree,
    };

    const progressDocId = firestore.collection("progress").doc(progressOne);

    await progressDocId.set(progressData);
    await progressDocId.collection("terms").doc(vocabIdOne).set(termDataOne);
    await progressDocId.collection("terms").doc(vocabIdTwo).set(termDataTwo);
    await progressDocId
      .collection("terms")
      .doc(vocabIdThree)
      .set(termDataThree);
    await progressDocId
      .collection("definitions")
      .doc(vocabIdOne)
      .set(definitionDataOne);
    await progressDocId
      .collection("definitions")
      .doc(vocabIdTwo)
      .set(definitionDataTwo);
    await progressDocId
      .collection("definitions")
      .doc(vocabIdThree)
      .set(definitionDataThree);

    const returnData = await createProgressWithIncorrect(progressOne);
    assert.strictEqual(typeof returnData, "string");
    await progressDocId.get((doc) => {
      const data = doc.data();
      assert.deepStrictEqual(data.correct, []);
      assert.deepStrictEqual(data.incorrect, []);
      assert.deepStrictEqual(data.correct, []);
      hamjest.assertThat(
        data.questions,
        hamjest.anyOf(
          hamjest.is([vocabOne, vocabTwo, vocabThree]),
          hamjest.is([vocabOne, vocabThree, vocabTwo]),
          hamjest.is([vocabTwo, vocabThree, vocabOne]),
          hamjest.is([vocabTwo, vocabOne, vocabThree]),
          hamjest.is([vocabOne, vocabTwo, vocabThree]),
          hamjest.is([vocabOne, vocabThree, vocabTwo])
        )
      );
      assert.strictEqual(data.duration, null);
      assert.strictEqual(data.progress, 0);
      assert.strictEqual(data.start_time, 1627308670962);
      assert.strictEqual(data.set_title, `${setOne} & ${setTwo}`);
      assert.strictEqual(data.uid, userOne);
      assert.strictEqual(data.switch_language, false);
      assert.strictEqual(data.mode, "questions");
      assert.deepStrictEqual(data.current_correct, []);
      assert.strictEqual(data.typo, false);
      assert.deepStrictEqual(data.setIds, []);
    });
    await progressDocId
      .collection("terms")
      .doc(`${setOne}__${vocabOne}`)
      .get()
      .then((doc) => assert.deepStrictEqual(doc.data(), termDataOne));
    await progressDocId
      .collection("terms")
      .doc(`${setOne}__${vocabTwo}`)
      .get()
      .then((doc) => assert.deepStrictEqual(doc.data(), termDataTwo));
    await progressDocId
      .collection("terms")
      .doc(`${setTwo}__${vocabThree}`)
      .get()
      .then((doc) => assert.deepStrictEqual(doc.data(), termDataThree));
    await progressDocId
      .collection("definitions")
      .doc(`${setOne}__${vocabOne}`)
      .get()
      .then((doc) => assert.deepStrictEqual(doc.data(), definitionDataOne));
    await progressDocId
      .collection("definitions")
      .doc(`${setOne}__${vocabTwo}`)
      .get()
      .then((doc) => assert.deepStrictEqual(doc.data(), definitionDataTwo));
    await progressDocId
      .collection("definitions")
      .doc(`${setTwo}__${vocabThree}`)
      .get()
      .then((doc) => assert.deepStrictEqual(doc.data(), definitionDataThree));
  });

  it("createProgressWithIncorrect correctly creates new progress record from progress record with incorrect answers in lives mode", async () => {
    const createProgressWithIncorrect = test.wrap(
      cloudFunctions.createProgressWithIncorrect
    );

    const vocabIdOne = `${setOne}__${vocabOne}`;
    const vocabIdTwo = `${setOne}__${vocabTwo}`;
    const vocabIdThree = `${setTwo}__${vocabThree}`;

    const progressData = {
      correct: [vocabIdTwo],
      incorrect: [vocabIdTwo, vocabIdTwo, vocabIdOne],
      questions: [vocabIdOne, vocabIdTwo, vocabIdThree],
      duration: null,
      progress: 1,
      start_time: 1627308670962,
      set_title: `${setOne} & ${setTwo}`,
      uid: userOne,
      switch_language: false,
      mode: "lives",
      current_correct: [],
      typo: false,
      setIds: [setOne, setTwo],
      lives: 2,
      start_lives: 5,
    };
    const termDataOne = {
      term: termOne,
    };
    const termDataTwo = {
      item: termTwo,
    };
    const termDataThree = {
      term: termThree,
    };
    const definitionDataOne = {
      item: definitionOne,
    };
    const definitionDataTwo = {
      item: definitionTwo,
    };
    const definitionDataThree = {
      item: definitionThree,
    };

    const progressDocId = firestore.collection("progress").doc(progressOne);

    await progressDocId.set(progressData);
    await progressDocId.collection("terms").doc(vocabIdOne).set(termDataOne);
    await progressDocId.collection("terms").doc(vocabIdTwo).set(termDataTwo);
    await progressDocId
      .collection("terms")
      .doc(vocabIdThree)
      .set(termDataThree);
    await progressDocId
      .collection("definitions")
      .doc(vocabIdOne)
      .set(definitionDataOne);
    await progressDocId
      .collection("definitions")
      .doc(vocabIdTwo)
      .set(definitionDataTwo);
    await progressDocId
      .collection("definitions")
      .doc(vocabIdThree)
      .set(definitionDataThree);

    const returnData = await createProgressWithIncorrect(progressOne);
    assert.strictEqual(typeof returnData, "string");
    await progressDocId.get((doc) => {
      const data = doc.data();
      assert.deepStrictEqual(data.correct, []);
      assert.deepStrictEqual(data.incorrect, []);
      assert.deepStrictEqual(data.correct, []);
      hamjest.assertThat(
        data.questions,
        hamjest.anyOf(
          hamjest.is([vocabOne, vocabTwo, vocabThree]),
          hamjest.is([vocabOne, vocabThree, vocabTwo]),
          hamjest.is([vocabTwo, vocabThree, vocabOne]),
          hamjest.is([vocabTwo, vocabOne, vocabThree]),
          hamjest.is([vocabOne, vocabTwo, vocabThree]),
          hamjest.is([vocabOne, vocabThree, vocabTwo])
        )
      );
      assert.strictEqual(data.duration, null);
      assert.strictEqual(data.progress, 0);
      assert.strictEqual(data.start_time, 1627308670962);
      assert.strictEqual(data.set_title, `${setOne} & ${setTwo}`);
      assert.strictEqual(data.uid, userOne);
      assert.strictEqual(data.switch_language, false);
      assert.strictEqual(data.mode, "questions");
      assert.deepStrictEqual(data.current_correct, []);
      assert.strictEqual(data.typo, false);
      assert.deepStrictEqual(data.setIds, []);
      assert.strictEqual(data.lives, 5);
      assert.strictEqual(data.start_lives, 5);
    });
    await progressDocId
      .collection("terms")
      .doc(`${setOne}__${vocabOne}`)
      .get()
      .then((doc) => assert.deepStrictEqual(doc.data(), termDataOne));
    await progressDocId
      .collection("terms")
      .doc(`${setOne}__${vocabTwo}`)
      .get()
      .then((doc) => assert.deepStrictEqual(doc.data(), termDataTwo));
    await progressDocId
      .collection("terms")
      .doc(`${setTwo}__${vocabThree}`)
      .get()
      .then((doc) => assert.deepStrictEqual(doc.data(), termDataThree));
    await progressDocId
      .collection("definitions")
      .doc(`${setOne}__${vocabOne}`)
      .get()
      .then((doc) => assert.deepStrictEqual(doc.data(), definitionDataOne));
    await progressDocId
      .collection("definitions")
      .doc(`${setOne}__${vocabTwo}`)
      .get()
      .then((doc) => assert.deepStrictEqual(doc.data(), definitionDataTwo));
    await progressDocId
      .collection("definitions")
      .doc(`${setTwo}__${vocabThree}`)
      .get()
      .then((doc) => assert.deepStrictEqual(doc.data(), definitionDataThree));
  });

  it("createProgressWithIncorrect won't create new progress record when old progress record belongs to different user", async () => {
    const createProgressWithIncorrect = test.wrap(
      cloudFunctions.createProgressWithIncorrect
    );

    const progressData = {
      correct: [vocabTwo],
      incorrect: [vocabTwo, vocabTwo, vocabOne],
      questions: [vocabOne, vocabTwo, vocabThree],
      duration: null,
      progress: 1,
      start_time: 1627308670962,
      set_title: `${setOne} & ${setTwo}`,
      uid: userTwo,
      switch_language: false,
      mode: "questions",
      current_correct: [],
      typo: false,
      setIds: [setOne, setTwo],
    };
    const termDataOne = {
      term: termOne,
    };
    const termDataTwo = {
      item: termTwo,
    };
    const termDataThree = {
      term: termThree,
    };
    const definitionDataOne = {
      item: definitionOne,
    };
    const definitionDataTwo = {
      item: definitionTwo,
    };
    const definitionDataThree = {
      item: definitionThree,
    };

    const progressDocId = firestore.collection("progress").doc(progressOne);

    await progressDocId.set(progressData);
    await progressDocId
      .collection("terms")
      .doc(`${setOne}__${vocabOne}`)
      .set(termDataOne);
    await progressDocId
      .collection("terms")
      .doc(`${setOne}__${vocabTwo}`)
      .set(termDataTwo);
    await progressDocId
      .collection("terms")
      .doc(`${setTwo}__${vocabThree}`)
      .set(termDataThree);
    await progressDocId
      .collection("definitions")
      .doc(`${setOne}__${vocabOne}`)
      .set(definitionDataOne);
    await progressDocId
      .collection("definitions")
      .doc(`${setOne}__${vocabTwo}`)
      .set(definitionDataTwo);
    await progressDocId
      .collection("definitions")
      .doc(`${setTwo}__${vocabThree}`)
      .set(definitionDataThree);

    firebase.assertFails(createProgressWithIncorrect(progressOne));
  });

  it("createProgressWithIncorrect won't create new progress record when progress ID argument isn't a string", async () => {
    const createProgressWithIncorrect = test.wrap(
      cloudFunctions.createProgressWithIncorrect
    );

    const progressData = {
      correct: [vocabTwo],
      incorrect: [vocabTwo, vocabTwo, vocabOne],
      questions: [vocabOne, vocabTwo, vocabThree],
      duration: null,
      progress: 1,
      start_time: 1627308670962,
      set_title: `${setOne} & ${setTwo}`,
      uid: userTwo,
      switch_language: false,
      mode: "questions",
      current_correct: [],
      typo: false,
      setIds: [setOne, setTwo],
    };
    const termDataOne = {
      term: termOne,
    };
    const termDataTwo = {
      item: termTwo,
    };
    const termDataThree = {
      term: termThree,
    };
    const definitionDataOne = {
      item: definitionOne,
    };
    const definitionDataTwo = {
      item: definitionTwo,
    };
    const definitionDataThree = {
      item: definitionThree,
    };

    const progressDocId = firestore.collection("progress").doc("1");

    await progressDocId.set(progressData);
    await progressDocId
      .collection("terms")
      .doc(`${setOne}__${vocabOne}`)
      .set(termDataOne);
    await progressDocId
      .collection("terms")
      .doc(`${setOne}__${vocabTwo}`)
      .set(termDataTwo);
    await progressDocId
      .collection("terms")
      .doc(`${setTwo}__${vocabThree}`)
      .set(termDataThree);
    await progressDocId
      .collection("definitions")
      .doc(`${setOne}__${vocabOne}`)
      .set(definitionDataOne);
    await progressDocId
      .collection("definitions")
      .doc(`${setOne}__${vocabTwo}`)
      .set(definitionDataTwo);
    await progressDocId
      .collection("definitions")
      .doc(`${setTwo}__${vocabThree}`)
      .set(definitionDataThree);

    firebase.assertFails(createProgressWithIncorrect(1));
  });

  it("createProgressWithIncorrect won't create new progress record when old progress record doesn't exist", async () => {
    const createProgressWithIncorrect = test.wrap(
      cloudFunctions.createProgressWithIncorrect
    );

    firebase.assertFails(createProgressWithIncorrect("invalid"));
  });

  it("createProgressWithIncorrect won't create new progress record when old progress record has no incorrect answers", async () => {
    const createProgressWithIncorrect = test.wrap(
      cloudFunctions.createProgressWithIncorrect
    );

    const progressData = {
      correct: [vocabTwo],
      incorrect: [],
      questions: [vocabOne, vocabTwo, vocabThree],
      duration: null,
      progress: 1,
      start_time: 1627308670962,
      set_title: `${setOne} & ${setTwo}`,
      uid: userOne,
      switch_language: false,
      mode: "questions",
      current_correct: [],
      typo: false,
      setIds: [setOne, setTwo],
    };
    const termDataOne = {
      term: termOne,
    };
    const termDataTwo = {
      item: termTwo,
    };
    const termDataThree = {
      term: termThree,
    };
    const definitionDataOne = {
      item: definitionOne,
    };
    const definitionDataTwo = {
      item: definitionTwo,
    };
    const definitionDataThree = {
      item: definitionThree,
    };

    const progressDocId = firestore.collection("progress").doc(progressOne);

    await progressDocId.set(progressData);
    await progressDocId
      .collection("terms")
      .doc(`${setOne}__${vocabOne}`)
      .set(termDataOne);
    await progressDocId
      .collection("terms")
      .doc(`${setOne}__${vocabTwo}`)
      .set(termDataTwo);
    await progressDocId
      .collection("terms")
      .doc(`${setTwo}__${vocabThree}`)
      .set(termDataThree);
    await progressDocId
      .collection("definitions")
      .doc(`${setOne}__${vocabOne}`)
      .set(definitionDataOne);
    await progressDocId
      .collection("definitions")
      .doc(`${setOne}__${vocabTwo}`)
      .set(definitionDataTwo);
    await progressDocId
      .collection("definitions")
      .doc(`${setTwo}__${vocabThree}`)
      .set(definitionDataThree);

    firebase.assertFails(createProgressWithIncorrect(progressOne));
  });
});
