import React from 'react';
import { withRouter } from "react-router-dom";
import { HomeRounded as HomeRoundedIcon, ArrowForwardRounded as ArrowForwardRoundedIcon, SettingsRounded as SettingsRoundedIcon, CloseRounded as CloseRoundedIcon, PeopleRounded as PeopleRoundedIcon, QuestionAnswerRounded as QuestionAnswerRoundedIcon } from "@material-ui/icons";
import NavBar from "./NavBar";
import Button from "./Button";
import Error404 from "./Error404";
import SettingsContent from "./SettingsContent";
import Footer from "./Footer";
import LineChart from './LineChart';
import ProgressStats from './ProgressStats';
import ConfirmationDialog from "./ConfirmationDialog";

import "./css/PopUp.css";
import "./css/Progress.css";
import "./css/Chart.css";

export default withRouter(class Progress extends React.Component {
	changeableStateItems = {
		loading: false,
		canProceed: true,
		canStartTest: true,
		showTestRestart: false,
		showIncorrectTestStart: false,
		progressInaccessible: false,
		correct: 0,
		incorrect: 0,
		totalQuestions: 0,
		progress: 0,
		setTitle: "",
		switchLanguage: false,
		answerInput: "",
		currentPrompt: "",
		currentSound: false,
		currentSetOwner: "",
		nextPrompt: "",
		nextSound: false,
		nextSetOwner: "",
		currentAnswerStatus: null,
		currentCorrect: [],
		moreAnswers: true,
		duration: 0,
		incorrectAnswers: {},
		showSettings: false,
		soundInput: this.props.sound,
		themeInput: this.props.theme,
		coloredEdgesInput: this.props.coloredEdges,
		setIds: [],
		attemptNumber: 1,
		attemptHistory: {},
		questions: [],
		originalTotalQuestions: 1,
		lives: 1,
		startLives: null,
		setComplete: false,
		averagePercentage: null,
		pageLoaded: false,
		startTime: null,
	}

	constructor(props) {
		super(props);
		this.state = {
			user: props.user,
			db: props.db,
			functions: {
				processAnswer: props.functions.httpsCallable("processAnswer"),
				createProgress: props.functions.httpsCallable("createProgress"),
				createProgressWithIncorrect: props.functions.httpsCallable("createProgressWithIncorrect"),
			},
			navbarItems: [
				{
					type: "button",
					onClick: this.showSettings,
					icon: <SettingsRoundedIcon />,
					hideTextMobile: true,
				},
				{
					type: "link",
					link: "/",
					icon: <HomeRoundedIcon />,
					hideTextMobile: true,
				}
			],
			...this.changeableStateItems,
		};
		
		let isMounted = true;
		Object.defineProperty(this, "isMounted", {
			get: () => isMounted,
			set: (value) => isMounted = value,
		});
	}

	setState = (state, callback=null) => {
		if (this.isMounted) super.setState(state, callback);
	}

	async componentDidMount() {
		this.unlisten = this.props.history.listen((location, action) => {
			if (location.pathname.startsWith("/progress/")) this.setState(this.changeableStateItems, () => this.componentDidMount());
		});

		const progressId = this.props.match.params.progressId;
		const progressRef = this.state.db.collection("progress").doc(progressId);
		
		let [ newState, setDone, incorrectAnswers, duration, setIds ] = await progressRef.get().then((doc) => {
			const data = doc.data();
			
			document.title = `Study | ${data.set_title} | Parandum`;

			let newState = {
				correct: data.correct.length,
				incorrect: data.incorrect.length,
				totalQuestions: data.questions.length,
				questions: data.questions,
				progress: data.progress,
				setTitle: data.set_title,
				switchLanguage: data.switch_language,
				currentSetOwner: data.set_owner,
				currentCorrect: data.current_correct,
				mode: data.mode,
				nextPrompt: null,
				setIds: data.setIds,
				originalTotalQuestions: [...new Set(data.questions)].length,
				setComplete: data.duration !== null,
				pageLoaded: true,
			};

			if (data.lives) {
				newState.lives = data.lives;
				newState.startLives = data.start_lives;
			}

			return [ newState, data.duration !== null, data.incorrect, data.duration, data.setIds ];
		}).catch((error) => {
			console.log(`Progress data inaccessible: ${error}`);
			return [
				{
					progressInaccessible: true,
				},
				true
			];
		});

		if (!newState.progressInaccessible) {
			if (!setDone) {
				let nextPromptRef;
				if (!newState.switchLanguage) {
					nextPromptRef = progressRef
						.collection("terms")
						.doc(newState.questions[newState.progress]);
				} else {
					nextPromptRef = progressRef
						.collection("definitions")
						.doc(newState.questions[newState.progress]);
				}
		
				await nextPromptRef.get().then((doc) => {
					newState.currentPrompt = doc.data().item;
					newState.currentSound = doc.data().sound === true;
				}).catch((error) => {
					newState.progressInaccessible = true;
					console.log(`Progress data inaccessible: ${error}`);
				});
			} else {
				newState.moreAnswers = false;
				newState.currentAnswerStatus = true;
				newState.duration = duration;

				let promises = [];
				promises.push(this.state.db.collection("progress")
					.where("uid", "==", this.state.user.uid)
					.where("setIds", "==", newState.setIds)
					.orderBy("start_time")
					.get()
					.then((querySnapshot) => {
						newState.attemptNumber = querySnapshot.docs.map((doc) => doc.id).indexOf(this.props.match.params.progressId) + 1;
						if (querySnapshot.docs.length > 1)
							newState.attemptHistory = querySnapshot.docs.filter((doc) => doc.data().duration !== null)
								.map((doc) => {
									if (doc.id === this.props.match.params.progressId) newState.startTime = doc.data().start_time;
									return {
										x: new Date(doc.data().start_time),
										y: (doc.data().correct.length / doc.data().questions.length * 100),
									}
								});
					}));

				promises.push(this.state.db.collection("completed_progress")
					.doc(setIds.sort().join("__"))
					.get()
					.then((completedProgressDoc) => {
						newState.averagePercentage = (completedProgressDoc.data().total_percentage / completedProgressDoc.data().attempts).toFixed(2);
					}).catch((error) => {
						console.log(`Couldn't get average percentage: ${error}`);
						newState.averagePercentage = null;
					}));

				if (incorrectAnswers.length > 0) {
					newState.incorrectAnswers = {};
					
					promises.push(Promise.all(incorrectAnswers.map((vocabId) => {
						if (newState.incorrectAnswers[vocabId]) {
							return newState.incorrectAnswers[vocabId].count++;
						} else {
							newState.incorrectAnswers[vocabId] = {
								count: 1,
							};

							return Promise.all([
								progressRef.collection("terms")
									.doc(vocabId)
									.get().then((termDoc) => {
										newState.switchLanguage ? newState.incorrectAnswers[vocabId].answer = termDoc.data().item.split("/") : newState.incorrectAnswers[vocabId].prompt = termDoc.data().item;
									}),
								progressRef.collection("definitions")
									.doc(vocabId)
									.get().then((definitionDoc) => {
										newState.switchLanguage ? newState.incorrectAnswers[vocabId].prompt = definitionDoc.data().item : newState.incorrectAnswers[vocabId].answer = definitionDoc.data().item.split("/");
									})
							]);
						}
					})).catch((error) => {
						console.log(`Couldn't retrieve incorrect answers: ${error}`);
					}));
				}

				await Promise.all(promises);
			}
		}

		this.setState(newState, () => {
			if (!newState.progressInaccessible && !setDone) this.answerInput.focus();
		});

		this.props.page.load();

		this.props.logEvent("select_content", {
			content_type: "progress",
			item_id: this.props.match.params.progressId,
		});
	}

	componentWillUnmount() {
		this.isMounted = false;
		this.props.page.unload();
		this.unlisten();
	}

	showSettings = () => {
		this.setState({
			showSettings: true,
		});
	}

	handleSoundInputChange = (event) => {
		this.setState({
			soundInput: event.target.checked,
		});
	}

	handleThemeInputChange = (newTheme) => {
		if (this.state.themeInput !== newTheme) this.setState({
			themeInput: newTheme,
		});
	}

	handleColoredEdgesInputChange = (event) => {
		this.setState({
			coloredEdgesInput: event.target.checked,
		});
	}

	saveSettings = (globalChange) => {
		this.props.handleSoundChange(this.state.soundInput, globalChange);
		this.props.handleThemeChange(this.state.themeInput, globalChange);
		this.props.handleColoredEdgesChange(this.state.coloredEdgesInput, globalChange);
		this.hideSettings();
	}

	hideSettings = () => {
		this.setState({
			showSettings: false,
		});
	}

	handleAnswerInput = (event) => {
		if (this.state.canProceed) {
			this.setState({
				answerInput: event.target.value,
			});
		}
	}

	proceed = () => {
		if (this.state.canProceed) {
			if (this.state.currentAnswerStatus === null) {
				this.processAnswer();
			} else {
				this.nextQuestion();
			}
		}
	}

	cleanseVocabString = (item) => {
		const chars = " .,()-_'\"";

		let newString = item;

		chars.split("").forEach((char) => {
			newString = newString.replace(char, "");
		});

		return newString;
	}

	processAnswer = async () => {
		if (this.state.canProceed) {
			const cleansedCurrentCorrect = this.state.currentCorrect.map(item => this.cleanseVocabString(item));
	
			this.startLoading();
	
			if (!cleansedCurrentCorrect.includes(this.cleanseVocabString(this.state.answerInput))) {
				this.state.functions.processAnswer({
					answer: this.state.answerInput,
					progressId: this.props.match.params.progressId,
				}).then(async (result) => {
					if (result.data.typo) {
						this.setState({
							typo: true,
							loading: false,
							canProceed: true,
						});
						return true;
					}

					const data = result.data;
					let newState = {
						currentAnswerStatus: data.correct ? null : false,
						currentCorrect: data.correctAnswers,
						moreAnswers: data.moreAnswers,
						nextPrompt: data.nextPrompt ? data.nextPrompt.item : null,
						nextSound: data.nextPrompt ? data.nextPrompt.sound : null,
						nextSetOwner: data.nextPrompt ? data.nextPrompt.set_owner : null,
						progress: data.progress,
						totalQuestions: data.totalQuestions,
						correct: data.totalCorrect,
						incorrect: data.totalIncorrect,
						currentVocabId: data.currentVocabId,
						loading: false,
						canProceed: true,
						typo: false,
						canStartTest: true,
					};

					if (data.correct) {
						this.props.logEvent("correct_answer", {
							progress_id: this.props.match.params.progressId,
						});
					} else {
						this.props.logEvent("incorrect_answer", {
							progress_id: this.props.match.params.progressId,
						});
					}

					if (this.state.mode === "lives") newState.lives = data.lives;
	
					if (data.correct) {
						// correct answer given
						newState.answerInput = "";
						// show next question if there are no more answers
						if (!data.moreAnswers) newState = this.showNextQuestion(newState, newState);
					} else {
						// incorrect answer given
						// store prompt and count=0
						// store answer if in lives mode and no lives left
						newState.incorrectAnswers = this.state.incorrectAnswers;
						newState.incorrectAnswers[data.currentVocabId] = {
							prompt: this.state.currentPrompt,
							answer: data.lives === 0 ? data.correctAnswers : "",
							count: 0,
						};
					}

					if ((data.correct || data.lives === 0) && !data.moreAnswers && this.state.incorrectAnswers[data.currentVocabId]) {
						// all answers to question given correctly
						// answer was previously wrong
						// store correct answer
						newState.incorrectAnswers = this.state.incorrectAnswers;
						newState.incorrectAnswers[data.currentVocabId].answer = data.correctAnswers;
					}

					let promises = [];

					if (data.duration) {
						// test done
						newState.duration = data.duration;
						newState.averagePercentage = data.averagePercentage;

						this.props.logEvent("test_complete", {
							progress_id: this.props.match.params.progressId,
						});

						promises.push(this.state.db.collection("progress")
							.where("uid", "==", this.state.user.uid)
							.where("setIds", "==", this.state.setIds)
							.orderBy("start_time")
							.get()
							.then((querySnapshot) => {
								newState.attemptNumber = querySnapshot.docs.map((doc) => doc.id).indexOf(this.props.match.params.progressId) + 1;
								if (querySnapshot.docs.length > 1)
									newState.attemptHistory = querySnapshot.docs.filter((doc) => doc.data().duration !== null)
										.map((doc) => {
											if (doc.id === this.props.match.params.progressId) newState.startTime = doc.data().start_time;
											return {
												x: new Date(doc.data().start_time),
												y: (doc.data().correct.length / doc.data().questions.length * 100),
											}
										});
							}));
					}

					if (data.incorrectAnswers) {
						let unsavedAnswers = {};

						if (!newState.incorrectAnswers) {
							newState.incorrectAnswers = {};
						}

						data.incorrectAnswers.map((vocabId) => {
							if (newState.incorrectAnswers[vocabId] && newState.incorrectAnswers[vocabId].answer !== "") {
								// already been logged including prompt and correct answer
								newState.incorrectAnswers[vocabId].count++;
							} else {
								// not been saved yet
								// update count in unsaved answers
								unsavedAnswers[vocabId] ? unsavedAnswers[vocabId]++ : unsavedAnswers[vocabId] = 1;
							}
							return true;
						});

						promises.push(Promise.all(Object.keys(unsavedAnswers).map((vocabId) => {
							// get and store vocab docs that haven't already been stored (due to refresh)
							const progressDocRef = this.state.db
								.collection("progress")
								.doc(this.props.match.params.progressId);

							newState.incorrectAnswers[vocabId] = {
								count: unsavedAnswers[vocabId],
							};

							return Promise.all([
								progressDocRef.collection("terms")
									.doc(vocabId)
									.get().then((termDoc) => {
										this.state.switchLanguage ? newState.incorrectAnswers[vocabId].answer = termDoc.data().item.split("/") : newState.incorrectAnswers[vocabId].prompt = termDoc.data().item;
									}),
								progressDocRef.collection("definitions")
									.doc(vocabId)
									.get().then((definitionDoc) => {
										this.state.switchLanguage ? newState.incorrectAnswers[vocabId].prompt = definitionDoc.data().item : newState.incorrectAnswers[vocabId].answer = definitionDoc.data().item.split("/");
									})
							]);
						})));
					}

					await Promise.all(promises);
	
					this.setState(newState, () => {
						if (!newState.duration) this.answerInput.focus()
					});
				}).catch((error) => {
					console.log(`Couldn't process answer: ${error}`);
					this.setState({
						loading: false,
						canProceed: true,
					});
				});
			} else {
				this.setState({
					currentAnswerStatus: null,
					answerInput: "",
					loading: false,
					canProceed: true,
					typo: false,
				});
			}
		}
	}

	showNextQuestion = (newState, currentState) => {
		if (currentState.nextPrompt === null) newState.setComplete = true;
		newState.currentCorrect = [];
		newState.currentPrompt = currentState.nextPrompt;
		newState.currentSound = currentState.nextSound;
		newState.currentSetOwner = currentState.nextSetOwner;
		return newState;
	}

	nextQuestion = () => {
		if (this.state.canProceed) {
			this.startLoading();
	
			let newState = {
				currentAnswerStatus: null,
				answerInput: "",
				loading: false,
				canProceed: true,
			};

			if (!this.state.moreAnswers) {
				newState = this.showNextQuestion(newState, this.state);
			}
			
			this.setState(newState, () => (this.isMounted && !this.state.setComplete) && this.answerInput.focus());
		}
	}

	msToTime = (time) => {
		const localeData = {
			minimumIntegerDigits: 2,
			useGrouping: false,
		};
		const seconds = Math.floor((time / 1000) % 60).toLocaleString("en-GB", localeData);
		const minutes = Math.floor((time / 1000 / 60) % 60).toLocaleString("en-GB", localeData);
		const hours = Math.floor(time / 1000 / 60 / 60).toLocaleString("en-GB", localeData);

		return `${hours}:${minutes}:${seconds}`;
	}

	startLoading = () => {
		this.setState({
			canStartTest: false,
			loading: true,
			canProceed: false,
		});
	}

	stopLoading = () => {
		this.setState({
			canStartTest: true,
			loading: false,
		});
	}

	recreateSameTest = () => {
		if (!this.state.loading) {
			this.state.functions.createProgress({
				sets: this.state.setIds,
				switch_language: this.state.switchLanguage,
				mode: this.state.mode,
				limit: this.state.mode === "questions" ? this.state.progress - this.state.incorrect
					: this.state.mode === "lives" ? this.state.lives
					: 1,
			}).then((result) => {
				const progressId = result.data;
				this.stopLoading();
				this.props.history.push("/progress/" + progressId);

				this.props.logEvent("restart_test", {
					progress_id: progressId,
				});
			}).catch((error) => {
				console.log(`Couldn't start test: ${error}`);
				this.stopLoading();
			});

			this.startLoading();
		}
	}

	createTestWithIncorrect = () => {
		if (!this.state.loading) {
			this.state.functions.createProgressWithIncorrect(this.props.match.params.progressId).then((result) => {
				const progressId = result.data;
				this.stopLoading();
				this.props.history.push("/progress/" + progressId);
	
				this.props.logEvent("start_test_with_incorrect", {
					progress_id: progressId,
				});
			}).catch((error) => {
				console.log(`Couldn't create test with incorrect answers: ${error}`);
				this.stopLoading();
			});
	
			this.startLoading();
		}
	}

	showTestRestart = () => {
		if (this.state.canStartTest) {
			this.setState({
				showTestRestart: true,
			});
		}
	}

	hideTestRestart = () => {
		this.setState({
			showTestRestart: false,
		});
	}

	showIncorrectTestStart = () => {
		if (this.state.canStartTest) {
			this.setState({
				showIncorrectTestStart: true,
			});
		}
	}

	hideIncorrectTestStart = () => {
		this.setState({
			showIncorrectTestStart: false,
		});
	}

	render() {
		return (
			<div>
			{
				this.props.page.loaded &&
				(this.state.progressInaccessible
				?
				<Error404 />
				:
				<>
					<NavBar items={this.state.navbarItems} />
					{
						this.state.currentAnswerStatus === null && !this.state.setComplete
						?
						<main className="progress-container">
							<div>
								<p className="current-prompt">{this.state.currentPrompt}</p>
								<form className="answer-input-container" onSubmit={(e) => e.preventDefault()} >
									<input type="submit" className="form-submit" onClick={this.proceed} />
									<input
										type="text"
										name="answer_input"
										className="answer-input"
										onChange={this.handleAnswerInput}
										value={this.state.answerInput}
										ref={inputEl => (this.answerInput = inputEl)}
										autoComplete="off"
									/>
									<Button
										onClick={() => this.processAnswer()}
										icon={<ArrowForwardRoundedIcon />}
										className="button--round"
										disabled={!this.state.canProceed}
										loading={this.state.loading}
									></Button>
								</form>
								<p className={!this.state.typo ? "hide" : ""}>Are you sure?</p>
								<div className="correct-answers">
									{
										this.state.currentCorrect && this.state.currentCorrect.length > 0
											?
											<>
												<h2>
													{
														this.state.moreAnswers
															?
															"Correct so far:"
															:
															"Answers:"
													}
												</h2>
												{this.state.currentCorrect.map((vocab, index) =>
													<p key={index}>{vocab}</p>
												)}
											</>
											:
											""
									}
								</div>
							</div>
						</main>
						:
						this.state.nextPrompt === null && !this.state.moreAnswers && this.state.setComplete
						?
						<main>
							{/* DONE */}
							<div className="page-header">
								<h1>
									{this.state.setTitle}
									<span className="title-icon">
										{
											this.state.mode === "questions"
											?
											<QuestionAnswerRoundedIcon />
											:
											<PeopleRoundedIcon />
										}
									</span>
								</h1>
							</div>
							<div className="progress-stat-row-container">
								<div className="stat-row stat-row--inline">
									<p>You got</p>
									<h1>{`${(this.state.correct / this.state.totalQuestions * 100).toFixed(2)}%`}</h1>
								</div>
								<div className="stat-row stat-row--inline">
									<h1>{`${this.state.correct} of ${this.state.totalQuestions}`}</h1>
									<p>marks</p>
								</div>
								{
									this.state.averagePercentage !== null &&
									<div className="stat-row stat-row--inline">
										<p>The average is</p>
										<h1>{`${this.state.averagePercentage}%`}</h1>
									</div>
								}
								<div className="stat-row stat-row--inline">
									<p>You took</p>
									<h1>{this.msToTime(this.state.duration)}</h1>
								</div>
								<div className="stat-row stat-row--inline stat-row--no-gap">
									<p>Attempt #</p>
									<h1>{this.state.attemptNumber}</h1>
								</div>
								{
									this.state.startLives &&
									<div className="stat-row stat-row--inline">
										<p>with</p>
										<h1>{this.state.startLives}</h1>
										<p>lives</p>
									</div>
								}
							</div>

							<div className="progress-end-button-container">
								<Button
									onClick={this.showTestRestart}
								>
									Restart test
								</Button>
								{
									this.state.incorrect > 0 &&
									<Button
										onClick={this.showIncorrectTestStart}
									>
										Create test with incorrect
									</Button>
								}
							</div>

							{
								this.state.incorrectAnswers && Object.keys(this.state.incorrectAnswers).length > 0 &&
								<>
									<h2>Incorrect answers:</h2>
									<div className="progress-end-incorrect-answers">
										<div>
											<h3>Prompt</h3>
											<h3>Answer</h3>
											<h3>Mistakes</h3>
										</div>
										{
											Object.keys(this.state.incorrectAnswers).map(key =>
												[key, this.state.incorrectAnswers[key].count])
													.sort((a,b) => b[1] - a[1]).map(item =>
														<div key={item[0]}>
															<p>{this.state.incorrectAnswers[item[0]].prompt ? this.state.incorrectAnswers[item[0]].prompt : ""}</p>
															<p>{this.state.incorrectAnswers[item[0]].answer ? this.state.incorrectAnswers[item[0]].answer.join("/") : ""}</p>
															<p>{this.state.incorrectAnswers[item[0]].count}</p>
														</div>
											)
										}
									</div>
								</>
							}

							{Object.keys(this.state.attemptHistory).length > 1 &&
								<>
									<h2 className="chart-title">History</h2>
									<LineChart data={this.state.attemptHistory} currentPointX={this.state.startTime} />
								</>
							}
						</main>
						:
						<main className="progress-container">
							{/* ANSWER PROCESSED */}
							<div>
								<p className="current-prompt">{this.state.currentPrompt}</p>
								<form className="answer-input-container answer-input-container--answer-entered" onSubmit={(e) => e.preventDefault()} >
									<input type="submit" className="form-submit" onClick={this.proceed} />
									<input
										type="text"
										name="answer_input"
										className={`answer-input ${this.state.currentAnswerStatus ? "answer--correct" : "answer--incorrect"}`}
										value={this.state.answerInput}
										ref={inputEl => (this.answerInput = inputEl)}
										readOnly
										autoComplete="off"
									/>
									<Button
										onClick={() => this.nextQuestion()}
										icon={<ArrowForwardRoundedIcon />}
										className="button--round"
										disabled={!this.state.canProceed}
										loading={this.state.loading}
									></Button>
								</form>
								<p className={this.state.currentAnswerStatus ? "answer--correct" : "answer--incorrect"}>
									{
										this.state.currentAnswerStatus ? "Correct!" : "Incorrect"
									}
								</p>
								<div className="correct-answers">
									{
										this.state.currentCorrect
										?
										<>
											<h2>
												{
													this.state.moreAnswers
													?
													"Correct so far:"
													:
													"Answers:"
												}
											</h2>
											{this.state.currentCorrect.map((vocab, index) => 
												<p key={index}>{vocab}</p>
											)}
										</>
										:
										""
									}
								</div>
							</div>
						</main>
					}
					{
						!this.state.setComplete &&
							<ProgressStats
								correct={this.state.correct}
								incorrect={this.state.incorrect}
								progressNumerator={this.state.mode === "lives" ? this.state.lives : this.state.correct}
								progressDenominator={this.state.mode === "lives" ? this.state.startLives : this.state.originalTotalQuestions}
								progress={this.state.progress}
								grade={(this.state.correct + this.state.incorrect) > 0 ? this.state.correct / (this.state.correct + this.state.incorrect) * 100 : 0}
								maxQuestions={this.state.mode === "lives" ? this.state.originalTotalQuestions : null}
							/>
					}
					<Footer />

					{
						this.state.showSettings &&
						<>
							<div className="overlay" onClick={this.hideSettings}></div>
							<div className="overlay-content progress-settings-overlay-content">
								<SettingsContent
									sound={this.props.sound}
									theme={this.props.theme}
									saveSettings={this.saveSettings}
									handleSoundInputChange={this.handleSoundInputChange}
									handleThemeInputChange={this.handleThemeInputChange}
									handleColoredEdgesInputChange={this.handleColoredEdgesInputChange}
									themes={this.props.themes}
									soundInput={this.state.soundInput}
									themeInput={this.state.themeInput}
									coloredEdgesInput={this.state.coloredEdgesInput}
								/>


								<div className="settings-save-container">
									<Button
										onClick={() => this.saveSettings(true)}
									>
										Save
									</Button>
									<Button
										onClick={() => this.saveSettings(false)}
									>
										Save for this session
									</Button>
								</div>

								<Button
									onClick={this.hideSettings}
									icon={<CloseRoundedIcon />}
									className="button--no-background popup-close-button"
								></Button>
							</div>
						</>
					}
					{
						this.state.showTestRestart &&
						<ConfirmationDialog
							yesFunction={this.recreateSameTest}
							noFunction={this.hideTestRestart}
							message="Restart test?"
							loading={this.state.loading}
						/>
					}
					{
						this.state.showIncorrectTestStart &&
						<ConfirmationDialog
							yesFunction={this.createTestWithIncorrect}
							noFunction={this.hideIncorrectTestStart}
							message="Create test with incorrect answers?"
							loading={this.state.loading}
						/>
					}
				</>)
			}
			</div>
		)
	}
})
