import React, { Component } from 'react';
import { ArrowDropDownRounded as ArrowDropDownRoundedIcon, HistoryRounded as HistoryRoundedIcon, HomeRounded as HomeRoundedIcon } from "@material-ui/icons";
import NavBar from "./NavBar";
import Footer from "./Footer";
import "./css/History.css";
import "./css/MistakesHistory.css";

import Collapsible from "react-collapsible";
import Checkbox from '@material-ui/core/Checkbox';
import Select from "react-select";

export default class IncorrectHistory extends Component {
	constructor(props) {
		super(props);
		this.state = {
			user: props.user,
			db: props.db,
			navbarItems: [
				{
					type: "link",
					name: "History",
					link: "/history",
					icon: <HistoryRoundedIcon />,
					hideTextMobile: true,
				},
				{
					type: "link",
					link: "/",
					icon: <HomeRoundedIcon />,
					hideTextMobile: true,
				}
			],
			totalIncorrect: 0,
			totalTests: 0,
			sets: {},
			selectedSet: {
				value: "all_sets",
				label: "All sets",
			},
			includeCompoundTests: true,
			incorrectAnswers: [],
			filteredIncorrectAnswers: [],
			setsWithHistory: {},
		};

		let isMounted = true;
		Object.defineProperty(this, "isMounted", {
			get: () => isMounted,
			set: (value) => isMounted = value,
		});
	}

	setState = (state, callback = null) => {
		if (this.isMounted) super.setState(state, callback);
	}

	async componentDidMount() {
		document.title = "Incorrect | History | Parandum";

		let promises = [];
		let newState = {
			sets: {},
			setsWithHistory: {},
		};

		promises.push(
			this.state.db.collection("incorrect_answers")
				.where("uid", "==", this.state.user.uid)
				.orderBy("term", "asc")
				.get()
				.then(async (querySnapshot) => {
					let incorrectAnswers = [];
					let subPromises = [];
					querySnapshot.docs.map((doc, index, array) => {
						// if (index === 0 || doc.data().term !== array[array.length - 1].data().term || doc.data().definition !== array[array.length - 1].data().definition) {
						// 	incorrectAnswers.push({
						// 		term: doc.data().term,
						// 		definition: doc.data().definition,
						// 		switchedAnswers: {},
						// 		notSwitchedAnswers: {},
						// 		switchedCount: 0,
						// 		notSwitchedCount: 0,
						// 	});
						// }

						// if (doc.data().switch_language) {
						// 	if (Object.keys(incorrectAnswers[incorrectAnswers.length - 1].switchedAnswers).includes(doc.data().answer)) {
						// 		incorrectAnswers[incorrectAnswers.length - 1].switchedAnswers[doc.data().answer]++;
						// 	} else {
						// 		incorrectAnswers[incorrectAnswers.length - 1].switchedAnswers[doc.data().answer] = 1;
						// 	}
						// 	incorrectAnswers[incorrectAnswers.length - 1].switchedCount++;
						// } else {
						// 	if (Object.keys(incorrectAnswers[incorrectAnswers.length - 1].notSwitchedAnswers).includes(doc.data().answer)) {
						// 		incorrectAnswers[incorrectAnswers.length - 1].notSwitchedAnswers[doc.data().answer]++;
						// 	} else {
						// 		incorrectAnswers[incorrectAnswers.length - 1].notSwitchedAnswers[doc.data().answer] = 1;
						// 	}
						// 	incorrectAnswers[incorrectAnswers.length - 1].notSwitchedCount++;
						// }



						if (index === 0 || doc.data().term !== array[index - 1].data().term || doc.data().definition !== array[index - 1].data().definition) {
							incorrectAnswers.push({
								term: doc.data().term,
								definition: doc.data().definition,
								answers: [{
									answer: doc.data().answer,
									switchLanguage: doc.data().switch_language,
									setIds: doc.data().setIds,
								}],
								count: doc.data().switch_language ? 0 : 1,
								switchedCount: doc.data().switch_language ? 1 : 0,
								setIds: doc.data().setIds,
							});
						} else {
							incorrectAnswers[incorrectAnswers.length - 1].answers.push({
								answer: doc.data().answer,
								switchLanguage: doc.data().switch_language,
								setIds: doc.data().setIds,
							});
							doc.data().setIds.map((setId) => {
								if (!incorrectAnswers[incorrectAnswers.length - 1].setIds.includes(setId))
									return incorrectAnswers[incorrectAnswers.length - 1].setIds.push(setId);
								return true;
							});
							if (doc.data().switch_language) {
								incorrectAnswers[incorrectAnswers.length - 1].switchedCount++;
							} else {
								incorrectAnswers[incorrectAnswers.length - 1].count++;
							}
						}

						// doc.data().setIds.map((setId) => subPromises.push(
						// 	this.state.db.collection("sets")
						// 		.doc(setId)
						// 		.get()
						// 		.then((doc) => 
						// 			newState.setsWithHistory[setId] = doc.data().title
						// 		)
						// ));
						doc.data().setIds.map((setId, setIndex) =>
							newState.setsWithHistory[setId] = doc.data().set_titles[setIndex]
						);

						return true;
					});
					newState.incorrectAnswers = incorrectAnswers.sort((a,b) => b.count + b.switchedCount - a.count - a.switchedCount);
					newState.filteredIncorrectAnswers = newState.incorrectAnswers;
					newState.totalIncorrect = querySnapshot.docs.length;
					await Promise.all(subPromises);
				})
				.catch((error) => {
					newState.incorrectAnswers = [];
					newState.totalIncorrect = 0;
					console.log(`Couldn't get mistakes history: ${error}`);
				})
		);

		promises.push(
			this.state.db.collection("progress")
				.where("uid", "==", this.state.user.uid)
				.get()
				// .then((querySnapshot) => newState.totalTests = querySnapshot.docs.length)
				.then((querySnapshot) => {
					newState.progressHistory = querySnapshot.docs.map((doc) =>
						({
							setIds: doc.data().setIds,
						})
					);
					newState.totalTests = newState.progressHistory.length;
				})
		);

		await Promise.all(promises);

		this.setState(newState);

		this.props.page.load();

		this.props.logEvent("page_view");
	}

	componentWillUnmount() {
		this.isMounted = false;
		this.props.page.unload();
	}

	arraysHaveSameMembers = (arr1, arr2) => {
		const set1 = new Set(arr1);
		const set2 = new Set(arr2);
		return arr1.every(item => set2.has(item)) &&
			arr2.every(item => set1.has(item));
	}

	handleSetSelectionChange = (selectedSet = this.state.selectedSet) => {
		let totalIncorrect = 0;
		const filteredIncorrectAnswers = (selectedSet.value === "all_sets" ?
			JSON.parse(JSON.stringify(this.state.incorrectAnswers))
			:
			JSON.parse(JSON.stringify(this.state.incorrectAnswers))
				.filter((vocabItem) =>
					vocabItem.setIds.includes(selectedSet.value)
				)
			)
			.map((vocabItem) => {
				let newVocabItem = vocabItem;
				if (selectedSet.value === "all_sets") {
					if (this.state.includeCompoundTests) {
						newVocabItem.answers = vocabItem.answers;
					} else {
						newVocabItem.answers = vocabItem.answers
							.filter((answer) =>
								answer.setIds.length === 1
							)
					}
				} else {
					newVocabItem.answers = vocabItem.answers
						.filter((answer) =>
							this.arraysHaveSameMembers(answer.setIds, [selectedSet.value]) ||
							(
								this.state.includeCompoundTests &&
								answer.setIds.includes(selectedSet.value)
							)
						)
				}
				newVocabItem.switchedCount = newVocabItem.answers.filter((answer) => answer.switchLanguage === true).length;
				newVocabItem.count = newVocabItem.answers.length - newVocabItem.switchedCount;

				totalIncorrect += newVocabItem.answers.length;

				return newVocabItem;
			});
		this.setState({
			filteredIncorrectAnswers: filteredIncorrectAnswers,
			selectedSet: selectedSet,
			totalIncorrect: totalIncorrect,
			totalTests: selectedSet.value === "all_sets" ?
				this.state.progressHistory.length
				:
				this.state.progressHistory
				.filter((progressItem) =>
					this.arraysHaveSameMembers(progressItem.setIds, [selectedSet.value]) ||
					(
						this.state.includeCompoundTests &&
						progressItem.setIds.includes(selectedSet.value)
					)
				)
				.length,
		});
	}

	handleIncludeCompoundTestsChange = (event) => {
		this.setState({
			includeCompoundTests: event.target.checked,
		}, () => this.handleSetSelectionChange());
	}

	render() {
		return (
			<div>
				<NavBar items={this.state.navbarItems} />
				<main>
					<h1>Mistakes</h1>

					<div className="history-sections">
						<Select
							className="set-select-container"
							value={this.state.selectedSet}
							onChange={this.handleSetSelectionChange}
							defaultValue={"all_sets"}
							options={
								[
									{
										value: "all_sets",
										label: "All sets",
									}
								].concat(Object.keys(this.state.setsWithHistory)
									.sort((a, b) => {
										if (this.state.setsWithHistory[a] < this.state.setsWithHistory[b]) {
											return -1;
										}
										if (this.state.setsWithHistory[a] > this.state.setsWithHistory[b]) {
											return 1;
										}
										return 0;
									})
									.map((setId) => {
										return {
											value: setId,
											label: this.state.setsWithHistory[setId]
										}
									})
								)
							}
							theme={theme => {
								const overlayColor = getComputedStyle(
									document.querySelector("#root > div")
								).getPropertyValue("--background-color-light")
									.trim();
								const textColor = getComputedStyle(
									document.querySelector("#root > div")
								).getPropertyValue("--text-color")
									.trim();
								const textColorTinted = getComputedStyle(
									document.querySelector("#root > div")
								).getPropertyValue("--text-color-tinted")
									.trim();
								const primaryColor = getComputedStyle(
									document.querySelector("#root > div")
								).getPropertyValue("--primary-color")
									.trim();
								const primaryColorDark = getComputedStyle(
									document.querySelector("#root > div")
								).getPropertyValue("--primary-color-dark")
									.trim();

								return {
									...theme,
									borderRadius: 6,
									colors: {
										...theme.colors,
										primary: primaryColor,
										primary25: primaryColorDark,
										neutral0: overlayColor,
										neutral5: overlayColor,
										neutral10: overlayColor,
										neutral20: textColorTinted,
										neutral30: textColor,
										neutral40: textColor,
										neutral50: textColor,
										neutral60: textColorTinted,
										neutral70: textColor,
										neutral80: textColor,
										neutral90: textColor,
									},
								}
							}}
						/>
						<label>
							<Checkbox
								checked={this.state.includeCompoundTests}
								onChange={this.handleIncludeCompoundTestsChange}
								inputProps={{ 'aria-label': 'checkbox' }}
							/>
							<span>Include compound tests</span>
						</label>

						<div className="historical-user-stats-container">
							<div className="stat-row stat-row--inline">
								<h1>{this.state.totalIncorrect}</h1>
								<p>mistakes</p>
							</div>
							{
								this.state.totalTests > 0 &&
								<div className="stat-row stat-row--inline">
									<p>average</p>
									<h1>{(this.state.totalIncorrect / this.state.totalTests).toFixed(2)}</h1>
									<p>per test</p>
								</div>
							}
							{
								this.state.incorrectAnswers.length > 0 &&
								<div className="stat-row stat-row--inline">
									<h1>{this.state.incorrectAnswers[0].term}</h1>
									<p>meaning</p>
									<h1>{this.state.incorrectAnswers[0].definition}</h1>
									<p>is the most common</p>
								</div>
							}
						</div>
						<div className="mistakes-history-container">
							{
								this.state.filteredIncorrectAnswers
									.filter((vocabItem) => vocabItem.answers && vocabItem.answers.length > 0)
									.map((vocabItem, index) => {
										let [switchedAnswersDict, notSwitchedAnswersDict] = [{}, {}];

										vocabItem.answers
											.map((answerItem) => {
												if (answerItem.switchLanguage) {
													if (switchedAnswersDict.hasOwnProperty(answerItem.answer)) {
														switchedAnswersDict[answerItem.answer].count++;
														return false;
													} else {
														switchedAnswersDict[answerItem.answer] = {
															...answerItem,
															count: 1,
														};
														return true;
													}
												} else {
													if (notSwitchedAnswersDict.hasOwnProperty(answerItem.answer)) {
														notSwitchedAnswersDict[answerItem.answer].count++;
														return false;
													} else {
														notSwitchedAnswersDict[answerItem.answer] = {
															...answerItem,
															count: 1,
														};
														return true;
													}
												}
											});

										const switchedAnswers = Object.keys(switchedAnswersDict)
											.map((answerItem) => switchedAnswersDict[answerItem])
											.sort((a, b) => {
												const countDifference = b.count - a.count;
												if (countDifference !== 0) return countDifference;
												if (a.answer < b.answer) {
													return -1;
												}
												if (a.answer > b.answer) {
													return 1;
												}
												return 0;
											});
										const notSwitchedAnswers = Object.keys(notSwitchedAnswersDict)
											.map((answerItem) => notSwitchedAnswersDict[answerItem])
											.sort((a, b) => {
												const countDifference = b.count - a.count;
												if (countDifference !== 0) return countDifference;
												if (a.answer < b.answer) {
													return -1;
												}
												if (a.answer > b.answer) {
													return 1;
												}
												return 0;
											});

										return (
											<React.Fragment key={index}>
												<div>
													<h2>{vocabItem.term}</h2>
													{
														vocabItem.switchedCount > 0
														?
														<Collapsible transitionTime={300} trigger={<><b>{vocabItem.switchedCount} mistake{vocabItem.switchedCount !== 1 && "s"}</b><ArrowDropDownRoundedIcon /></>}>
															{
																vocabItem.switchedCount > 0 &&
																<div>
																	{
																		switchedAnswers
																			.map((answerItem, index) => 
																				<p key={index}>{answerItem.answer === "" ? <i>skipped</i> : answerItem.answer}{answerItem.count > 1 && <i> (x{answerItem.count})</i>}</p>
																			)
																	}
																</div>
															}
														</Collapsible>
														:
														<b>0 mistakes</b>
													}
												</div>
												<div>
													<h2>{vocabItem.definition}</h2>
													{
														vocabItem.count > 0
														?
														<Collapsible transitionTime={300} trigger={<><b>{vocabItem.count} mistake{vocabItem.count !== 1 && "s"}</b><ArrowDropDownRoundedIcon /></>}>
															{
																vocabItem.count > 0 &&
																<div>
																	{
																		notSwitchedAnswers
																			.map((answerItem, index) => 
																				<p key={index}>{answerItem.answer === "" ? <i>skipped</i> : answerItem.answer}{answerItem.count > 1 && <i> (x{answerItem.count})</i>}</p>
																			)
																	}
																</div>
															}
														</Collapsible>
														:
														<b>0 mistakes</b>
													}
												</div>
											</React.Fragment>
										)
									})
							}
						</div>
					</div>
				</main>
				<Footer />
			</div>
		)
	}
}
