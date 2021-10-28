/* eslint-disable indent */
/* eslint-disable no-tabs */
const levenshtein = require('js-levenshtein');
const functions = require("firebase-functions").region("europe-west2");//.region("europe-west2")
const admin = require("firebase-admin");
admin.initializeApp();
const db = admin.firestore();

const LOCAL_TESTING = false;

/**
 * Randomises the items in an array.
 * @param {object} array The array to randomise.
 * @return {object} The randomised array.
 */
function shuffleArray(array) {
	for (let i = array.length - 1; i > 0; i--) {
		const j = Math.floor(Math.random() * (i + 1));
		[array[i], array[j]] = [array[j], array[i]];
	}
	return array;
}

/**
 * Adds extra user info when new user created.
 * NOTE: Can't be unit tested.
 * @return {promise} Promise from database write.
 */
exports.userCreated = functions.auth.user().onCreate((user) => {
	return admin.auth().setCustomUserClaims(user.uid, {
		admin: false,
	}).then(() => {
		return db.collection("users").doc(user.uid).set({
			sound: true,
			theme: "default",
			coloredEdges: false,
		});
	});
});

/**
 * Cleans up database when user deleted. Progress documents are kept as they may provide useful metrics.
 * NOTE: Can't be unit tested.
 * @return {promise} Promise from database delete.
 */
exports.userDeleted = functions.auth.user().onDelete((user) => {
	return db.collection("users").doc(user.uid).delete();
});

/**
 * Retrieves the user IDs and display names of all users in the given group.
 * @param {string} groupId The ID of the group whose users should be retrieved.
 * @return {object} A dictionary of owners, contributors, and members of the group.
 * @return {array} owners An array of objects, one for each user with the owner role for
 * 					the specified set, containing the users' display names and user IDs.
 * @return {string} owners[i].displayName The user's display name.
 * @return {string} owners[i].uid The user's ID.
 * @return {array} contributors An array of objects, one for each user with the contributor role
 * 					for the specified set, containing the users' display names and user IDs.
 * @return {string} contributors[i].displayName The user's display name.
 * @return {string} contributors[i].uid The user's ID.
 * @return {array} members An array of objects, one for each user with the member role for
 * 					the specified set, containing the users' display names and user IDs.
 * @return {string} members[i].displayName The user's display name.
 * @return {string} members[i].uid The user's ID.
 * NOTE: can't be unit tested
 */
exports.getGroupMembers = functions.https.onCall((data, context) => {
	const uid = LOCAL_TESTING ? "M3JPrFRH6Fdo8XMUbF0l2zVZUCH3" : context.auth.uid;

	if (context.app == undefined && !LOCAL_TESTING) {
		throw new functions.https.HttpsError(
			"failed-precondition",
			"The function must be called from an App Check verified app.");
	}

	if (typeof data.groupId !== "string") {
		throw new functions.https.HttpsError("invalid-argument", "Group ID must be a string");
	}

	return db.collection("groups")
		.doc(data.groupId)
		.get()
		.then((groupDoc) => {
			if (!groupDoc.data() || !groupDoc.data().users) {
				throw new functions.https.HttpsError("failed-precondition", "Group just created so users can't yet be retrieved - the only user is the group creator");
			}

			const groupUsers = groupDoc.data().users;

			if (groupUsers[uid] !== "owner") {
				throw new functions.https.HttpsError("permission-denied", "You must be a group owner to retrieve group members' data");
			}

			let groupOwners = [];
			let groupContributors = [];
			let groupMembers = [];
			
			return Promise.all(Object.keys(groupUsers).map((userId) => {
				return admin.auth()
					.getUser(userId)
					.then((userRecord) => {
						if (groupUsers[userId] === "owner") {
							groupOwners.push({
								displayName: userRecord.displayName,
								uid: userId,
							});
						} else if (groupUsers[userId] === "contributor") {
							groupContributors.push({
								displayName: userRecord.displayName,
								uid: userId,
							});
						} else {
							groupMembers.push({
								displayName: userRecord.displayName,
								uid: userId,
							});
						}
					});
			})).then(() => {
				const sortArray = (arr) => arr.sort((a, b) => {
					if (a.displayName < b.displayName) {
						return -1;
					}
					if (a.displayName > b.displayName) {
						return 1;
					}
					return 0;
				});
				
				return {
					owners: sortArray(groupOwners),
					contributors: sortArray(groupContributors),
					members: sortArray(groupMembers),
				};
			});
		});
})

/**
 * Creates new progress document.
 * @param {object} data The data passed to the function.
 * @param {array} data.sets An array of IDs of the desired sets.
 * @param {boolean} data.switch_language Whether or not the languages should be reversed.
 * @param {boolean} data.mode The mode to be tested in. Valid options are "questions" and "lives".
 * @param {boolean} data.limit The maximum number of lives/questions for the test.
 * @return {string} The ID of the created progress document.
*/
exports.createProgress = functions.https.onCall((data, context) => {
	const uid = LOCAL_TESTING ? "M3JPrFRH6Fdo8XMUbF0l2zVZUCH3" : context.auth.uid;
	if (context.app == undefined && !LOCAL_TESTING) {
		throw new functions.https.HttpsError(
			"failed-precondition",
			"The function must be called from an App Check verified app.");
	}
	
	if (typeof data.sets !== "object" || data.sets.length < 1) {
		throw new functions.https.HttpsError("invalid-argument", "At least one set must be provided");
	}

	if (typeof data.limit !== "number" || !Number.isInteger(data.limit) || data.limit < 1) {
		throw new functions.https.HttpsError("invalid-argument", "Limit must be an integer greater than 0")
	}

	if (typeof data.switch_language !== "boolean") {
		throw new functions.https.HttpsError("invalid-argument", "switch_language must be a boolean");
	}

	if (data.mode !== "questions" && data.mode !== "lives") {
		throw new functions.https.HttpsError("invalid-argument", "mode must be \"questions\" or \"lives\"");
	}
	
	return db.runTransaction(async (transaction) => {
		const setsId = db.collection("sets");
		let setTitlesDict = {};
		let allVocab = [];

		await Promise.all(data.sets.map((setId) => {
			return transaction.get(setsId.doc(setId)).then((setDoc) => {
				if (!setDoc.exists) {
					throw new functions.https.HttpsError("not-found", "Set doesn't exist");
				}
				if (!setDoc.data().public && setDoc.data().owner !== uid) {
					throw new functions.https.HttpsError("permission-denied", "Insufficient permissions to access set");
				}
				const setVocabCollectionId = db
					.collection("sets").doc(setId)
					.collection("vocab");
				
				return transaction.get(setVocabCollectionId).then((setVocab) => {
					if (setVocab.docs.length < 1) {
						throw new functions.https.HttpsError("failed-precondition", "Set must have at least one term/definition pair");
					}
					
					setTitlesDict[setId] = setDoc.data().title;

					return setVocab.docs.map((vocabDoc) => {
						let newVocabData = vocabDoc;
						newVocabData.vocabId = setDoc.data().owner + "__" + vocabDoc.id;
						allVocab.push(newVocabData);
					});
				});
			});
		}));

		const mode = data.mode;
		const limit = data.limit;
		const switchLanguage = data.switch_language;
		const progressDocId = db
			.collection("progress").doc();

		const allSetTitles = [...Object.values(setTitlesDict)].sort();
		const setTitle = allSetTitles.slice(0, -1).join(", ") + (allSetTitles.length > 1 ? " & " : "") + allSetTitles.slice(-1);

		const setIds = data.sets.sort((a, b) => {
			if (a < b) {
				return -1;
			}
			if (a > b) {
				return 1;
			}
			return 0;
		});

		let dataToSet = {
			questions: [],
			correct: [],
			current_correct: [],
			incorrect: [],
			progress: 0,
			start_time: Date.now(),
			set_title: setTitle,
			uid: uid,
			switch_language: switchLanguage,
			duration: null,
			mode: mode,
			setIds: setIds,
			set_titles: setIds.map((setId) => setTitlesDict[setId]),
			typo: false,
		}

		return {
			allVocab: allVocab,
			dataToSet: dataToSet,
			mode: mode,
			progressDocId: progressDocId,
			limit: limit,
		}
	}).then(async (data) => {
		let batches = [db.batch()];
		let promises = [];

		shuffleArray(data.allVocab).forEach(async (doc, index, array) => {
			if (index % 248 === 0) {
				promises.push(batches[batches.length - 1].commit());
				batches.push(db.batch());
			}
			
			const vocabId = doc.vocabId;

			const terms = {
				"item": doc.data().term,
				"sound": doc.data().sound,
			};
			const definitions = {
				"item": doc.data().definition,
				"sound": doc.data().sound,
			};

			data.dataToSet.questions.push(vocabId);

			batches[batches.length - 1].set(
				data.progressDocId.collection("terms").doc(vocabId),
				terms
			);
			batches[batches.length - 1].set(
				data.progressDocId.collection("definitions").doc(vocabId),
				definitions
			);

			if ((data.mode == "questions" && index >= data.limit - 1) || index === array.length - 1) {
				array.length = index + 1;
			}
		});

		if (data.mode === "lives") {
			data.dataToSet.lives = data.limit;
			data.dataToSet.start_lives = data.limit;
		}

		batches[batches.length - 1].set(
			data.progressDocId,
			data.dataToSet
		);

		promises.push(batches[batches.length - 1].commit());

		await Promise.all(promises);

		return data.progressDocId.id;
	});
});

/**
 * Creates new progress document using the incorrect answers from another progess document.
 * @param {string} data The progress ID of the existing progress document to use.
 * @return {string} The ID of the created progress document.
*/
exports.createProgressWithIncorrect = functions.https.onCall((data, context) => {
	const uid = LOCAL_TESTING ? "M3JPrFRH6Fdo8XMUbF0l2zVZUCH3" : context.auth.uid;

	if (context.app == undefined && !LOCAL_TESTING) {
		throw new functions.https.HttpsError(
			"failed-precondition",
			"The function must be called from an App Check verified app.");
	}

	return db.runTransaction(async (transaction) => {
		if (typeof data !== "string") {
			throw new functions.https.HttpsError("invalid-argument", "Progress ID must be a string");
		}

		const oldProgressDocId = db.collection("progress").doc(data);
		return transaction.get(oldProgressDocId)
			.then(async (doc) => {
				if (!doc.exists) throw new functions.https.HttpsError("invalid-argument", "Progress record doesn't exist");
				if (doc.data().uid !== uid) throw new functions.https.HttpsError("permission-denied", "Can't use other users' progress records");
				if (doc.data().incorrect.length < 1) throw new functions.https.HttpsError("failed-precondition", "Progress record must have at least one incorrect answer");

				let progressData = doc.data();
				let dataToSet = {
					correct: [],
					incorrect: [],
					questions: shuffleArray([... new Set(progressData.incorrect)]),
					duration: null,
					progress: 0,
					start_time: Date.now(),
					set_title: progressData.set_title,
					uid: progressData.uid,
					switch_language: progressData.switch_language,
					mode: progressData.mode,
					current_correct: [],
					typo: false,
					setIds: progressData.setIds,
				};
				if (progressData.mode === "lives") {
					dataToSet.lives = progressData.start_lives;
					dataToSet.start_lives = progressData.start_lives;
				}

				const newProgressDocId = db.collection("progress").doc();
				let batches = [db.batch()];
				let promises = [];

				dataToSet.questions.map(async (vocabId, index) => {
					if (index % 248 === 0) {
						batches.push(db.batch());
					}
					let currentBatchIndex = batches.length - 1;
					promises.push(transaction.get(oldProgressDocId.collection("terms").doc(vocabId))
						.then((termDoc) => {
							return batches[currentBatchIndex].set(
								newProgressDocId.collection("terms").doc(vocabId),
								termDoc.data()
							);
						}));
					promises.push(transaction.get(oldProgressDocId.collection("definitions").doc(vocabId))
						.then((termDoc) => {
							return batches[currentBatchIndex].set(
								newProgressDocId.collection("definitions").doc(vocabId),
								termDoc.data()
							);
						}));
				});

				batches[batches.length - 1].set(
					newProgressDocId,
					dataToSet
				);

				await Promise.all(promises);

				await Promise.all(batches.map((batch) => batch.commit()));

				return newProgressDocId.id;
			})
			.catch((error) => {
				throw new functions.https.HttpsError("unknown", "Can't create new progress record from existing one");
			});
	});
});

/**
 * Processes a response to a question in a vocab set.
 * @param {string} progressId The ID of the progress file to retrieve the prompt from.
 * @return {string} item The term/definition prompt for the next question.
 * @return {string} sound The file ID for the next question's sound file. Null if language is switched.
 *//*
exports.getPrompt = functions.https.onCall((data, context) => {
	// const uid = context.auth.uid;
	const uid = "M3JPrFRH6Fdo8XMUbF0l2zVZUCH3";

	const progressId = data;
	
	const progressDocId = db
		.collection("progress").doc(progressId);
	
	return db.runTransaction((transaction) => {
		return transaction.get(progressDocId).then((progressDoc) => {
			if (uid !== progressDoc.data().uid) {
				throw new functions.https.HttpsError("permission-denied", "Wrong user's progress");
			} else if (progressDoc.data().progress >= progressDoc.data().questions.length) {
				throw new functions.https.HttpsError("permission-denied", "Progress already completed")
			} else {
				nextIndex = progressDoc.data().progress;
				nextVocabId = progressDoc.data().questions[nextIndex];

				if (progressDoc.data().switch_language) {
					const promptDocId = progressDocId
						.collection("definitions").doc(nextVocabId);
					const sound = null;

					return transaction.get(promptDocId).then((promptDoc) => {
						return {
							item: promptDoc.data().item,
							sound: sound,
						}
					});
				} else {
					const promptDocId = progressDocId
						.collection("terms").doc(nextVocabId);

					return transaction.get(promptDocId).then((promptDoc) => {
						const sound = promptDoc.data().sound;
						return {
							item: promptDoc.data().item,
							sound: sound,
						}
					});
				}
			}
		});
	});
});*/

/**
 * Checks whether two arrays have the same members.
 * @param {array} arr1 The first array to compare.
 * @param {array} arr2 The second array to compare.
 * @return {boolean} Whether or not the two arrays have the same members.
 */
function arraysHaveSameMembers(arr1, arr2) {
	const set1 = new Set(arr1);
	const set2 = new Set(arr2);
	return arr1.every(item => set2.has(item)) &&
		arr2.every(item => set1.has(item));
}

/**
 * Removes characters from terms & definitions that should be ignored.
 * @param {string} item The term/definition to remove the characters that should be ignored from.
 * @return {string} The original string with the unwanted characters removed.
 */
function cleanseVocabString(item) {
	const chars = /[\p{P}\p{S} ]+/ug;
	return item.replace(chars, "");
}

/**
 * Processes a response to a question in a vocab set.
 * @param {object} data The data passed to the function.
 * @param {string} data.progressId The ID of the progress document to update.
 * @param {string} data.answer The answer given by the user to the current prompt.
 * @return {string} averagePercentage The average percentage mark for the current collection of sets. Only returned when the test is complete.
 * @return {boolean} correct Whether the provided answer was correct.
 * @return {array} correctAnswers An array of correct answers for the question just answered. If not all correct
 * 					answers have yet been given, and the current answer is correct, this only contains the correct
 * 					answers given so far.
 * @return {string} currentVocabId The vocab ID of the vocab item currently being evaluated.
 * @return {integer} duration The time taken for the test to be completed. Only returned when the test is complete.
 * @return {array} incorrectAnswers The vocab IDs of all incorrect answers given (including repeats for multiple incorrect answers). Only returned when the test is complete.
 * @return {integer} lives The total number of lives remaining. Only returned if mode is "lives".
 * @return {boolean} moreAnswers Whether or not there are more answers required for the current prompt.
 * @return {object} nextPrompt Details of the next prompt, if relevant. Null if last question has been answered.
 * @return {string} nextPrompt.item The term/definition prompt for the next question.
 * @return {boolean} nextPrompt.sound Whether the next prompt has an associated sound file. Null if language is switched.
 * @return {boolean} nextPrompt.set_owner User ID of the owner of the sound file associated with the next prompt. Null if there is no sound file.
 * @return {integer} progress Total number of questions answered so far.
 * @return {integer} totalQuestions Total number of questions in the set (including duplicates after incorrect answers).
 * @return {integer} totalCorrect Total number of correct answers so far.
 * @return {integer} totalIncorrect Total number of incorrect answers so far.
 * @return {boolean} typo Whether the inputted answer is likely to include a typo (using Levenshtein distance or by detecting a null answer).
 */
exports.processAnswer = functions.https.onCall((data, context) => {
	const uid = LOCAL_TESTING ? "M3JPrFRH6Fdo8XMUbF0l2zVZUCH3" : context.auth.uid;

	if (context.app == undefined && !LOCAL_TESTING) {
		throw new functions.https.HttpsError(
			"failed-precondition",
			"The function must be called from an App Check verified app.");
	}

	const progressId = data.progressId;
	const inputAnswer = data.answer;
	
	const progressDocId = db
		.collection("progress").doc(progressId);

	return db.runTransaction((transaction) => {
		return transaction.get(progressDocId).then((progressDoc) => {
			if (!progressDoc.exists) {
				throw new functions.https.HttpsError("not-found", "Progress record " + progressId + " doesn't exist")
			}
			if (uid !== progressDoc.data().uid) {
				throw new functions.https.HttpsError("permission-denied", "Wrong user's progress");
			}
			if (progressDoc.data().progress >= progressDoc.data().questions.length || (progressDoc.data().mode === "lives" && progressDoc.data().lives <= 0)) {
				throw new functions.https.HttpsError("permission-denied", "Progress already completed")
			}

			const currentIndex = progressDoc.data().progress;
			const currentVocab = progressDoc.data().questions[currentIndex];

			termDocId = progressDocId
				.collection("terms").doc(currentVocab);
			definitionDocId = progressDocId
				.collection("definitions").doc(currentVocab);

			return transaction.get(progressDoc.data().switch_language ? termDocId : definitionDocId).then((answerDoc) => {
				const docData = progressDoc.data();
				const mode = docData.mode;
				const correctAnswers = answerDoc.data().item;
				const splitCorrectAnswers = correctAnswers.split("/");
				const cleansedSplitCorrectAnswers = splitCorrectAnswers.map((answer) => cleanseVocabString(answer));
				const cleansedInputAnswer = cleanseVocabString(inputAnswer);

				let isCorrectAnswer = false;
				let correctAnswerIndex;

				cleansedSplitCorrectAnswers.forEach((answer, index, array) => {
					if (answer === cleansedInputAnswer) {
						isCorrectAnswer = true;
						correctAnswerIndex = index;
						array.length = index + 1;
					}
				});

				if (!isCorrectAnswer && !progressDoc.data().typo) {
					if (cleansedInputAnswer === "") {
						docData.typo = true;
						transaction.set(progressDocId, docData);
						return {
							typo: true,
						};
					}
					let typo = false;
					cleansedSplitCorrectAnswers.forEach((answer, index, array) => {
						const levDistance = levenshtein(answer, cleansedInputAnswer);
						if (levDistance <= 1 ||
							answer.length > 5 && levDistance <= 3 ||
							cleansedInputAnswer.includes(answer)) {
								docData.typo = true;
								transaction.set(progressDocId, docData);
								typo = true;
								array.length = index + 1;
						}
					});
					if (typo) return {
						typo: true,
					};
				}

				let prevCorrect = progressDoc.data().current_correct;
				
				var returnData = {
					mode: mode,
					correct: isCorrectAnswer,
					correctAnswers: splitCorrectAnswers,
					currentVocabId: currentVocab,
					moreAnswers: false,
					nextPrompt: null,
					progress: docData.progress,
					totalQuestions: docData.questions.length,
					totalCorrect: docData.correct.length,
					totalIncorrect: docData.incorrect.length,
					typo: false,
				}

				docData.typo = false;

				var userGroups, incorrectAnswerDoc, prompt;

				if (isCorrectAnswer) {
					if (mode === "lives") {
						returnData.lives = docData.lives;
					}

					if (!prevCorrect) {
						docData.current_correct = [splitCorrectAnswers[correctAnswerIndex]];
					} else if (!prevCorrect.includes(splitCorrectAnswers[correctAnswerIndex])) {
						docData.current_correct.push(splitCorrectAnswers[correctAnswerIndex]);
					}
					
					if (docData.current_correct.length === splitCorrectAnswers.length) {
						docData.progress++;
						returnData.progress = docData.progress;
						docData.current_correct = [];
						docData.correct.push(currentVocab);
						returnData.totalCorrect = docData.correct.length;
					} else {
						returnData.moreAnswers = true;
						returnData.correctAnswers = docData.current_correct;
					}
				} else {
					if (mode === "lives") {
						returnData.lives = --docData.lives;
					}

					returnData.progress = ++docData.progress;
					docData.incorrect.push(currentVocab);
					docData.questions.push(currentVocab);
					const doneQuestions = docData.questions.slice(0, docData.progress);
					const notDoneQuestions = docData.questions.slice(docData.progress);
					docData.current_correct = [];
					docData.questions = doneQuestions.concat(shuffleArray(notDoneQuestions));
					returnData.totalQuestions = docData.questions.length;
					returnData.totalIncorrect = docData.incorrect.length;

					userGroups = transaction.get(db.collection("users").doc(uid).collection("groups")).then((querySnapshot) => querySnapshot.docs.map((doc) => doc.id));
					incorrectAnswerDoc = db.collection("incorrect_answers").doc();
					prompt = transaction.get(progressDoc.data().switch_language ? definitionDocId : termDocId).then((doc) => doc.data().item);
				}

				if (!returnData.moreAnswers) {
					if (docData.progress >= docData.questions.length || (mode === "lives" && docData.lives <= 0)) {
						const duration = Date.now() - docData.start_time;
						docData.duration = duration;
						returnData.duration = duration;
						returnData.incorrectAnswers = docData.incorrect;

						if (mode === "lives" && docData.lives <= 0) docData.questions.length = returnData.totalQuestions = docData.progress;
						
						const completedProgressDocId = db.collection("completed_progress").doc(progressDoc.data().setIds.sort().join("__"));
						return transaction.get(completedProgressDocId).then(async (completedProgressDoc) => {
							if (!completedProgressDoc.exists) throw new Error("Completed progress doc doesn't exist");

							if (!isCorrectAnswer) transaction.set(incorrectAnswerDoc, {
								uid: uid,
								groups: await userGroups,
								term: progressDoc.data().switch_language ? correctAnswers : await prompt,
								definition: progressDoc.data().switch_language ? await prompt : correctAnswers,
								answer: inputAnswer.trim(),
								switch_language: progressDoc.data().switch_language,
								setIds: progressDoc.data().setIds,
								set_titles: progressDoc.data().set_titles,
							});

							const totalPercentage = completedProgressDoc.data().total_percentage + (docData.correct.length / docData.questions.length * 100);
							const attempts = completedProgressDoc.data().attempts + 1;
							transaction.set(completedProgressDocId, {
								attempts: attempts,
								total_percentage: totalPercentage,
								set_title: completedProgressDoc.data().set_title,
							});
							returnData.averagePercentage = (totalPercentage / attempts).toFixed(2);
							transaction.set(progressDocId, docData);
							return returnData;
						}).catch(async (error) => {
							const allSetTitles = progressDoc.data().set_titles;
							const setTitle = allSetTitles.slice(0, -1).join(", ") + (allSetTitles.length > 1 ? " & " : "") + allSetTitles.sort().slice(-1);
							if (!isCorrectAnswer) transaction.set(incorrectAnswerDoc, {
								uid: uid,
								groups: await userGroups,
								term: progressDoc.data().switch_language ? correctAnswers : await prompt,
								definition: progressDoc.data().switch_language ? await prompt : correctAnswers,
								answer: inputAnswer.trim(),
								switch_language: progressDoc.data().switch_language,
								setIds: progressDoc.data().setIds,
								set_titles: progressDoc.data().set_titles,
							});

							const totalPercentage = docData.correct.length / docData.questions.length * 100;
							transaction.set(completedProgressDocId, {
								attempts: 1,
								total_percentage: totalPercentage,
								set_title: setTitle,
							});
							returnData.averagePercentage = totalPercentage.toFixed(2);
							transaction.set(progressDocId, docData);
							return returnData;
						});
					} else {
						const nextVocabId = docData.questions[docData.progress];
						const nextSetOwner = nextVocabId.split("__")[0];

						if (docData.switch_language) {
							const promptDocId = progressDocId
								.collection("definitions").doc(nextVocabId);
							const sound = null;

							return transaction.get(promptDocId).then(async (promptDoc) => {
								if (!isCorrectAnswer) transaction.set(incorrectAnswerDoc, {
									uid: uid,
									groups: await userGroups,
									term: progressDoc.data().switch_language ? correctAnswers : await prompt,
									definition: progressDoc.data().switch_language ? await prompt : correctAnswers,
									answer: inputAnswer.trim(),
									switch_language: progressDoc.data().switch_language,
									setIds: progressDoc.data().setIds,
									set_titles: progressDoc.data().set_titles,
								});

								returnData.nextPrompt = {
									item: promptDoc.data().item,
									sound: sound,
									set_owner: nextSetOwner,
								}
								transaction.set(progressDocId, docData);
								return returnData;
							});
						} else {
							const promptDocId = progressDocId
								.collection("terms").doc(nextVocabId);

							return transaction.get(promptDocId).then(async (promptDoc) => {
								if (!isCorrectAnswer) transaction.set(incorrectAnswerDoc, {
									uid: uid,
									groups: await userGroups,
									term: progressDoc.data().switch_language ? correctAnswers : await prompt,
									definition: progressDoc.data().switch_language ? await prompt : correctAnswers,
									answer: inputAnswer.trim(),
									switch_language: progressDoc.data().switch_language,
									setIds: progressDoc.data().setIds,
									set_titles: progressDoc.data().set_titles,
								});

								const sound = promptDoc.data().sound;
								returnData.nextPrompt = {
									item: promptDoc.data().item,
									sound: sound,
									set_owner: nextSetOwner,
								}
								transaction.set(progressDocId, docData);
								return returnData;
							});
						}
					}
				} else {
					transaction.set(progressDocId, docData);
					return returnData;
				}
			});
		});
	});
});

/**
 * Sets the admin state of a user (excluding the authenticated user), if the authenticated
 * user is an admin themselves.
 * @param {object} data The data passed to the function.
 * @param {string} data.targetUser The ID of the user whose admin state should be changed.
 * @param {boolean} data.adminState The target admin state.
 * @return {promise} The promise from setting the target user's admin custom auth claim.
*/
exports.setAdmin = functions.https.onCall(async (data, context) => {
	const uid = LOCAL_TESTING ? "M3JPrFRH6Fdo8XMUbF0l2zVZUCH3" : context.auth.uid;
	const isAdmin = LOCAL_TESTING ? true : context.auth.token.admin;

	if (context.app == undefined && !LOCAL_TESTING) {
		throw new functions.https.HttpsError(
			"failed-precondition",
			"The function must be called from an App Check verified app.");
	}

	const targetUser = data.targetUser;
	const adminState = data.adminState;

	if (isAdmin) {
		if (uid !== targetUser) {
			return await admin.auth().setCustomUserClaims(targetUser, {
				admin: adminState,
			});
		} else {
			throw new functions.https.HttpsError("permission-denied", "Cannot change admin status of authenticated user");
		}
	} else {
		throw new functions.https.HttpsError("permission-denied", "Must be an admin to change other users' admin states");
	}
});

/**
 * Adds an existing vocab set to an existing group.
 * @param {object} data The data passed to the function.
 * @param {string} data.groupId The ID of the group to which the set should be added.
 * @param {boolean} data.setId The ID of the set that should be added to the group.
 * @return {boolean} true, to show the function has succeeded.
*/
exports.addSetToGroup = functions.https.onCall((data, context) => {
	const uid = LOCAL_TESTING ? "M3JPrFRH6Fdo8XMUbF0l2zVZUCH3" : context.auth.uid;
	const isAdmin = LOCAL_TESTING ? false : context.auth.token.admin;
	const auth = LOCAL_TESTING ? { uid: uid } : context.auth;

	if (context.app == undefined && !LOCAL_TESTING) {
		throw new functions.https.HttpsError(
			"failed-precondition",
			"The function must be called from an App Check verified app.");
	}

	const groupId = data.groupId;
	const setId = data.setId;
	const setDocId = db.collection("sets").doc(setId);
	const userGroupDocId = db.collection("users").doc(uid).collection("groups").doc(groupId);
	const groupDocId = db.collection("groups").doc(groupId);

	return db.runTransaction((transaction) => {
		return transaction.get(setDocId).then((setDoc) => {
			return transaction.get(userGroupDocId).then((userGroupDoc) => {
				const userRole = userGroupDoc.data().role;

				if (auth && (setDoc.data().public || setDoc.data().owner == uid) && (userRole == "contributor" || userRole == "owner" || isAdmin)) {
					let setDocData = setDoc.data();
					if (setDocData.groups != null && setDocData.groups.includes(groupId)) {
						throw new functions.https.HttpsError("permission-denied", "Set is already part of group");
					} else {
						return transaction.get(groupDocId).then((groupDoc) => {
							let groupDocData = groupDoc.data();
							if (setDocData.groups == null) {
								setDocData.groups = [];
							}
							if (groupDocData.sets == null) {
								groupDocData.sets = [];
							}
							setDocData.groups.push(groupId);
							groupDocData.sets.push(setId);

							setDocData.public = true;

							return Promise.all(
								[
									transaction.set(
										setDocId,
										setDocData,
									),
									transaction.set(
										groupDocId,
										groupDocData,
									)
								]
							).then(() => true);
						});
					}
				} else {
					throw new functions.https.HttpsError("permission-denied", "Insufficient permisisons to add set to group")
				}
			});
		});
	});
});

/**
 * Removes an existing vocab set from an existing group.
 * @param {object} data The data passed to the function.
 * @param {string} data.groupId The ID of the group from which the set should be removed.
 * @param {boolean} data.setId The ID of the set that should be removed from the group.
 * @return {promise} The promise from setting the group's updated data.
*/
exports.removeSetFromGroup = functions.https.onCall((data, context) => {
	const uid = LOCAL_TESTING ? "M3JPrFRH6Fdo8XMUbF0l2zVZUCH3" : context.auth.uid;
	const isAdmin = LOCAL_TESTING ? false : context.auth.token.admin;
	const auth = LOCAL_TESTING ? { uid: uid } : context.auth;

	if (context.app == undefined && !LOCAL_TESTING) {
		throw new functions.https.HttpsError(
			"failed-precondition",
			"The function must be called from an App Check verified app.");
	}

	const groupId = data.groupId;
	const setId = data.setId;
	const setDocId = db.collection("sets").doc(setId);
	const userGroupDocId = db.collection("users").doc(uid).collection("groups").doc(groupId);
	const groupDocId = db.collection("groups").doc(groupId);

	return db.runTransaction((transaction) => {
		return transaction.get(setDocId).then((setDoc) => {
			return transaction.get(userGroupDocId).then((userGroupDoc) => {
				const userRole = userGroupDoc.data().role;
				if (auth && (userRole == "owner" || isAdmin)) {
					let setDocData = setDoc.data();
					if (setDocData.groups == null || !setDocData.groups.includes(groupId)) {
						throw new functions.https.HttpsError("permission-denied", "Set is not part of group");
					} else {
						return transaction.get(groupDocId).then((groupDoc) => {
							setDocData.groups = setDocData.groups.filter(item => item !== groupId);
							let groupDocData = groupDoc.data();
							groupDocData.sets = groupDocData.sets.filter(item => item !== setId);

							return Promise.all([
								transaction.set(
									setDocId,
									setDocData,
								),
								transaction.set(
									groupDocId,
									groupDocData,
								)
							]).then(() => true);
						});
					}
				} else {
					throw new functions.https.HttpsError("permission-denied", "Insufficient permisisons to remove set from group")
				}
			});
		});
	});
});

/**
 * Changes an existing user's membership status of a group in the groups collection
 * in Firestore, after it has been changed in the users collection.
 * @param {object} change The change object from the function trigger.
 * @param {object} context The context object from the function trigger.
 * @return {boolean} Returns true on completion.
*/
async function updateUserGroupRole(snap, context) {
	await db.runTransaction((transaction) => {
		const groupDocId = db.collection("groups").doc(context.params.groupId);
		return transaction.get(groupDocId).then((groupDoc) => {
			let groupData = groupDoc.data();
			if (typeof groupData === "undefined") {
				throw new functions.https.HttpsError("not-found", "Group doesn't exist");
			}
			if (typeof groupData.users === "undefined") {
				groupData.users = {};
			}

			if (typeof snap !== "undefined" && typeof snap.data() !== "undefined" && typeof snap.data().role !== "undefined") {
				groupData.users[context.params.userId] = snap.data().role;
			} else {
				delete groupData.users[context.params.userId];
			}
			return transaction.set(
				groupDocId,
				groupData
			);
		});
	});

	return true;
}

/**
 * Changes an existing user's membership status of a group in the groups collection
 * in Firestore, after it has been created in the users collection.
 * NOTE: Can't be unit tested.
 * @return {boolean} Returns true on completion.
*/
exports.userGroupRoleCreated = functions.firestore.document("users/{userId}/groups/{groupId}")
	.onCreate(async (snap, context) => {
		return updateUserGroupRole(snap, context);
	});

/**
 * Changes an existing user's membership status of a group in the groups collection
 * in Firestore, after it has been updated in the users collection.
 * NOTE: Can't be unit tested.
 * @return {boolean} Returns true on completion.
*/
exports.userGroupRoleUpdated = functions.firestore.document("users/{userId}/groups/{groupId}")
	.onUpdate(async (change, context) => {
		return updateUserGroupRole(change.after, context);
	});

/**
 * Generates a random, unused group join code.
 * @return {string} The join code.
*/
async function generateJoinCode() {
	const joinCode = String(Math.random().toString(36).substring(5));
	const snapshot = await db.collection("join_codes").doc(joinCode).get();

	if (snapshot.exists) {
		return generateJoinCode();
	} else {
		return joinCode;
	}
}

/**
 * Creates a new group.
 * @param {string} data The display name for the new group.
 * @return {string} The ID of the new group's document in the groups collection.
*/
exports.createGroup = functions.https.onCall(async (data, context) => {
	const uid = LOCAL_TESTING ? "M3JPrFRH6Fdo8XMUbF0l2zVZUCH3" : context.auth.uid;

	if (context.app == undefined && !LOCAL_TESTING) {
		throw new functions.https.HttpsError(
			"failed-precondition",
			"The function must be called from an App Check verified app.");
	}

	const joinCode = await generateJoinCode();

	const groupDoc = await db.collection("groups").add({
		display_name: data,
		sets: [],
		users: {},
		join_code: joinCode,
	});

	db.collection("users").doc(uid).collection("groups").doc(groupDoc.id).set({
		role: "owner",
	});

	db.collection("join_codes").doc(joinCode).set({
		group: groupDoc.id,
	});

	return groupDoc.id;
});

/**
 * Cleans up database after group is deleted - removes group references from user groups collections.
 * NOTE: Can't be unit tested.
 * @return {boolean} Returns true on completion.
*/
exports.groupDeleted = functions.firestore.document("groups/{groupId}")
	.onDelete(async (snap, context) => {
		let batch = db.batch();
		const users = snap.data().users;
		const sets = snap.data().sets;
		const joinCode = snap.data().join_code;

		let counter = 0;
		for (userId of Object.keys(users)) {
			batch.delete(
				db.collection("users").doc(userId).collection("groups").doc(context.params.groupId)
			);
			counter++;
			if (counter >= 19) {
				batch.commit();
				batch = db.batch();
				counter = 0;
			}
		}

		batch.delete(db.collection("join_codes").doc(joinCode));

		await Promise.all([
			batch.commit(),
			Promise.all(sets.map((setId) => {
				return db.runTransaction((transaction) => {
					return transaction.get(
							db.collection("sets")
							.doc(setId)
						)
						.then((setDoc) => {
							let data = setDoc.data();
							if (!data.groups) {
								data.groups = [];
							} else {
								data.groups.splice(data.groups.indexOf(context.params.groupId), 1);
							}
							transaction
								.set(
									db.collection("sets")
										.doc(setId),
									data
								);
						});
				});
			}))
		]);

		return true;
	});

/**
 * Cleans up database after set is deleted - removes vocab subcollection.
 * NOTE: Can't be unit tested.
 * @return {promise} Returns true on completion.
*/
exports.setDeleted = functions.firestore.document("sets/{setId}")
	.onDelete(async (snap, context) => {
		await deleteCollection(
			db,
			"/sets/" + context.params.setId + "/vocab",
			500
		);

		return true;
	});

/**
 * Cleans up database after progress record is deleted - removes vocab subcollections.
 * NOTE: Can't be unit tested.
 * @return {boolean} Returns true on completion.
*/
exports.progressDeleted = functions.firestore.document("progress/{progressId}")
	.onDelete(async (snap, context) => {
		await Promise.all([
			deleteCollection(
				db,
				"/progress/" + context.params.progressId + "/terms",
				500
			),
			deleteCollection(
				db,
				"/progress/" + context.params.progressId + "/definitions",
				500
			)
		]);

		return true;
	});

/**
 * Deletes a Firestore collection.
 * @param {FirebaseFirestore.Firestore} db The database object from which the collection should be deleted.
 * @param {string} collectionPath The path of the collection to be deleted.
 * @param {integer} batchSize The maximum batch size.
 * @return {promise} A promise with the result of the deleteQueryBatch function.
*/
async function deleteCollection(db, collectionPath, batchSize) {
	const collectionRef = db.collection(collectionPath);
	const query = collectionRef.orderBy('__name__').limit(batchSize);

	return new Promise((resolve, reject) => {
		deleteQueryBatch(db, query, resolve).catch(reject);
	});
}

/**
 * Deletes a batch of Firestore documents.
 * @param {FirebaseFirestore.Firestore} db The database object from which the collection should be deleted.
 * @param {string} query The delete query.
 * @param {integer} resolve The resolve object from a generated promise.
*/
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
