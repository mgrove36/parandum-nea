import React, { Component } from 'react';
import { ArrowDropDownRounded as ArrowDropDownRoundedIcon, GroupRounded as GroupRoundedIcon, HomeRounded as HomeRoundedIcon } from "@material-ui/icons";
import { withRouter } from 'react-router-dom';
import Select from "react-select";
import NavBar from "./NavBar";
import Footer from "./Footer";
import Error404 from "./Error404";
import "./css/History.css";
import "./css/MistakesHistory.css";

import Collapsible from "react-collapsible";
import Checkbox from '@material-ui/core/Checkbox';

export default withRouter(class GroupStats extends Component {
	constructor(props) {
		super(props);
		this.state = {
			user: props.user,
			db: props.db,
			navbarItems: [
				{
					type: "link",
					link: `/groups/${this.props.match.params.groupId}`,
					icon: <GroupRoundedIcon />,
					hideTextMobile: true,
				},
				{
					type: "link",
					link: "/",
					icon: <HomeRoundedIcon />,
					hideTextMobile: true,
				}
			],
			role: null,
			groupName: "",
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
		let newState = {
			sets: {},
			setsWithHistory: {},
		};

		await this.state.db
			.collection("users")
			.doc(this.state.user.uid)
			.collection("groups")
			.doc(this.props.match.params.groupId)
			.get()
			.then((userGroupDoc) => {
				newState.role = userGroupDoc.data().role;
			})
			.catch((error) => {
				console.log(`Can't access user group: ${error}`);
				newState.role = "none";
			});

		if (newState.role === "owner") {
			await this.state.db
				.collection("groups")
				.doc(this.props.match.params.groupId)
				.get()
				.then(async (groupDoc) => {
					document.title = `Stats | ${groupDoc.data().display_name} | Parandum`;
					newState.groupName = groupDoc.data().display_name;
					
					return Promise.all(groupDoc.data().sets.map((setId) => {
						return this.state.db.collection("sets")
							.doc(setId)
							.get()
							.then((doc) => {
								newState.sets[setId] = {
									title: doc.data().title,
								};
							});
					}));
				}).catch((error) => {
					console.log(`Can't access group: ${error}`);
					newState.groupName = "";
					document.title = "Stats | Parandum";
				});

			const groupSetIds = Object.keys(newState.sets);
			if (groupSetIds.length > 0) await this.state.db.collection("incorrect_answers")
				.where("groups", "array-contains", this.props.match.params.groupId)
				.orderBy("term", "asc")
				.get()
				.then((querySnapshot) => {
					let incorrectAnswers = [];
					querySnapshot.docs.map((doc, index, array) => {
						if (doc.data().setIds.some(item => groupSetIds.includes(item))) {
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

							doc.data().setIds.map((setId) => newState.setsWithHistory[setId] = true);

							return true;
						}
						return false;
					});
					newState.incorrectAnswers = incorrectAnswers.sort((a, b) => b.count + b.switchedCount - a.count - a.switchedCount);
					newState.filteredIncorrectAnswers = newState.incorrectAnswers;
					newState.totalIncorrect = querySnapshot.docs.length;
				})
				.catch((error) => {
					newState.incorrectAnswers = [];
					newState.totalIncorrect = 0;
					console.log(`Couldn't get group progress: ${error}`);
				});
		}

		this.setState(newState);
		this.props.page.load();

		this.props.logEvent("select_content", {
			content_type: "group_stats",
			item_id: this.props.match.params.groupId,
		});
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
		});
	}

	handleIncludeCompoundTestsChange = (event) => {
		this.setState({
			includeCompoundTests: event.target.checked,
		}, () => this.handleSetSelectionChange());
	}

	render() {
		return (
			this.state.role !== null ?
			(this.state.role === "owner"
			?
			<div>
				<NavBar items={this.state.navbarItems} />
				<main>
					<h1>Group Stats: {this.state.groupName}</h1>
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
								].concat(Object.keys(this.state.sets)
									.filter((setId) => this.state.setsWithHistory[setId] === true)
									.sort((a, b) => {
										if (this.state.sets[a].title < this.state.sets[b].title) {
											return -1;
										}
										if (this.state.sets[a].title > this.state.sets[b].title) {
											return 1;
										}
										return 0;
									})
									.map((setId) => {
										return {
											value: setId,
											label: this.state.sets[setId].title
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
								this.state.filteredIncorrectAnswers.length > 0 &&
								<div className="stat-row stat-row--inline">
									{/* <h1>{this.state.incorrectAnswers[0].term}</h1> */}
									<h1>{this.state.filteredIncorrectAnswers[0].term}</h1>
									<p>meaning</p>
									{/* <h1>{this.state.incorrectAnswers[0].definition}</h1> */}
									<h1>{this.state.filteredIncorrectAnswers[0].definition}</h1>
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
											.sort((a,b) => {
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
			:
			<Error404 />)
			:
			null
		)
	}
})
