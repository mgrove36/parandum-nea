import React from 'react';
import { withRouter } from "react-router-dom";
import { HomeRounded as HomeRoundedIcon, PlayArrowRounded as PlayArrowRoundedIcon, EditRounded as EditRoundedIcon, CloudQueueRounded as CloudQueueRoundedIcon, GroupAddRounded as GroupAddRoundedIcon, CloseRounded as CloseRoundedIcon, DeleteRounded as DeleteRoundedIcon } from "@material-ui/icons";
import NavBar from "./NavBar";
import Button from "./Button";
import LinkButton from "./LinkButton";
import Error404 from "./Error404";
import Footer from "./Footer";
import TestStart from './TestStart';
import ClassicTestStart from './ClassicTestStart';
import LivesTestStart from './LivesTestStart';
import CountdownTestStart from './CountdownTestStart';
import ConfirmationDialog from "./ConfirmationDialog";

import "./css/PopUp.css";
import "./css/SetPage.css";
import "./css/ConfirmationDialog.css";

export default withRouter(class SetPage extends React.Component {
	constructor(props) {
		super(props);
		this.state = {
			user: props.user,
			db: props.db,
			functions: {
				createProgress: props.functions.httpsCallable("createProgress"),
				addSetToGroup: props.functions.httpsCallable("addSetToGroup"),
			},
			loading: false,
			canStartTest: true,
			navbarItems: [
				{
					type: "link",
					link: "/",
					icon: <HomeRoundedIcon />,
					hideTextMobile: true,
				}
			],
			set: {
				title: "",
				public: false,
				vocab: [],
			},
			setInaccessible: false,
			showAddSetToGroup: false,
			canAddSetToGroup: true,
			addSetToGroupLoading: {},
			groups: {},
			currentSetGroups: [],
			showDeleteConfirmation: false,
			showTestStart: false,
			showClassicTestStart: false,
			showLivesTestStart: false,
			sliderValue: 1,
			switchLanguage: false,
			totalTestQuestions: 1,
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

	componentDidMount() {
		const setId = this.props.match.params.setId;
		const setRef = this.state.db
			.collection("sets")
			.doc(setId);
		const setVocabRef = setRef
			.collection("vocab")
			.orderBy("term");

		setRef.get().then((setDoc) => {
			document.title = `${setDoc.data().title} | Parandum`;

			setVocabRef.get().then((querySnapshot) => {
				let vocab = [];
				querySnapshot.docs.map((doc) => {
					const data = doc.data();
					return vocab.push({
						term: data.term,
						definition: data.definition,
						sound: data.sound,
					});
				});
				this.setState({
					set: {
						...this.state.set,
						title: setDoc.data().title,
						public: setDoc.data().public,
						vocab: vocab,
						owner: setDoc.data().owner,
					},
					currentSetGroups: setDoc.data().groups,
				});
				this.props.page.load();
			});
		}).catch((error) => {
			this.setState({
				setInaccessible: true,
			});
			this.props.page.load();
			console.log(`Can't access set: ${error}`);
		});

		this.props.logEvent("select_content", {
			content_type: "set",
			item_id: this.props.match.params.setId,
		});
	}

	componentWillUnmount() {
		this.isMounted = false;
		this.props.page.unload();
	}

	stopLoading = () => {
		this.setState({
			canStartTest: true,
			loading: false,
		});
	}
	
	startTest = (mode) => {
		if (this.state.canStartTest) {
			this.state.functions.createProgress({
				sets: [this.props.match.params.setId],
				switch_language: this.state.switchLanguage,
				mode: mode,
				limit: this.state.sliderValue,
			}).then((result) => {
				const progressId = result.data;
				this.stopLoading();
				this.props.history.push("/progress/" + progressId);

				this.props.logEvent("start_test", {
					progress_id: progressId,
				});
			}).catch((error) => {
				console.log(`Couldn't start test: ${error}`);
				this.stopLoading();
			});
	
			this.setState({
				canStartTest: false,
				loading: true,
			});
		}
	};

	showAddSetToGroup = async () => {
		let newState = {
			showAddSetToGroup: true,
			groups: {},
			addSetToGroupLoading: {},
		};
		await this.state.db.collection("users")
			.doc(this.state.user.uid)
			.collection("groups")
			.where("role", "!=", "member")
			.get()
			.then((querySnapshot) => {
				return Promise.all(querySnapshot.docs.map((userGroupDoc) => {
					if (!this.state.currentSetGroups.includes(userGroupDoc.id))
						return this.state.db.collection("groups")
							.doc(userGroupDoc.id)
							.get()
							.then((groupDoc) => {
								newState.groups[userGroupDoc.id] = groupDoc.data().display_name;
								newState.addSetToGroupLoading[userGroupDoc.id] = false;
							});
					return true;
				}));
			})
		this.setState(newState);
	}

	hideAddSetToGroup = () => {
		this.setState({
			showAddSetToGroup: false,
		});
	}

	stopAddSetToGroupLoading = (groupId, addedSetToGroup = false) => {
		let newState = {
			addSetToGroupLoading: {
				...this.state.addSetToGroupLoading,
				[groupId]: false,
			},
			canAddSetToGroup: true,
			showAddSetToGroup: false,
		};
		if (addedSetToGroup) newState.currentSetGroups = this.state.currentSetGroups.concat(groupId);
		this.setState(newState);
	}

	addSetToGroup = (groupId) => {
		if (this.state.canAddSetToGroup) {
			this.setState({
				addSetToGroupLoading: {
					...this.state.addSetToGroupLoading,
					[groupId]: true,
				},
				canAddSetToGroup: false,
			});
	
			this.state.functions.addSetToGroup({
				groupId: groupId,
				setId: this.props.match.params.setId,
			}).then((result) => {
				this.stopAddSetToGroupLoading(groupId, true);
			}).catch((error) => {
				console.log(`Couldn't add set to group: ${error}`);
			});
		}
	}

	showDeleteSet = () => {
		this.setState({
			showDeleteConfirmation: true,
		});
	}

	hideDeleteConfirmation = () => {
		this.setState({
			showDeleteConfirmation: false,
		});
	}

	deleteSet = () => {
		this.state.db.collection("sets")
			.doc(this.props.match.params.setId)
			.delete()
			.then(() => {
				this.props.history.push("/");
			}).catch((error) => {
				console.log(`Couldn't delete set: ${error}`);
				this.setState({
					showDeleteConfirmation: false,
				})
			});
	}

	showTestStart = () => {
		if (this.state.canStartTest) {
			this.setState({
				showTestStart: true,
				totalTestQuestions: 1,
			});
		}
	}

	hideTestStart = () => {
		this.setState({
			showTestStart: false,
		});
	}

	showIndividualTestPrompt = async (mode) => {
		if (!this.state.loading) {
			if (mode === "classic") {
				this.setState({
					loading: true,
				})

				const totalTestQuestions = await this.state.db.collection("sets")
					.doc(this.props.match.params.setId)
					.collection("vocab")
					.get()
					.then(querySnapshot => querySnapshot.docs.length);

				this.setState({
					showTestStart: false,
					showClassicTestStart: true,
					sliderValue: totalTestQuestions,
					switchLanguage: false,
					totalTestQuestions: totalTestQuestions,
					loading: false,
				});
			} else if (mode === "lives") {
				this.setState({
					showTestStart: false,
					showLivesTestStart: true,
					switchLanguage: false,
					sliderValue: 5,
				});
			} else {
				// countdown
				// this.setState({
				// 	showTestStart: false,
				// 	showCountdownTestStart: true,
				//	switchLanguage: false,
				// });
			}
		}
	}

	hideClassicTestStart = () => {
		this.setState({
			showClassicTestStart: false,
		});
	}

	hideLivesTestStart = () => {
		this.setState({
			showLivesTestStart: false,
		});
	}

	hideCountdownTestStart = () => {
		this.setState({
			showCountdownTestStart: false,
		});
	}

	changeSliderValue = (value) => {
		if (value >= 1 && value <= 999) this.setState({
			sliderValue: value,
		});
	}

	handleSwitchLanguageChange = (event) => {
		this.setState({
			switchLanguage: event.target.checked,
		});
	}

	render() {
		return (
			<div>
				{
					this.state.setInaccessible
					?
					<Error404 />
					:
					<>
						<NavBar items={this.state.navbarItems} />

						<main>
							<div className="page-header">
								<h1>
									{this.state.set.title}
									{
										this.state.set.public
										?
										<span className="title-icon"><CloudQueueRoundedIcon /></span>
										:
										""
									}
								</h1>
								<div className="button-container">	
									<Button
										loading={this.state.loading}
										onClick={this.showTestStart}
										icon={<PlayArrowRoundedIcon />}
										disabled={!this.state.canStartTest}
										className="button--round"
										title="Start test"
									></Button>
									<Button
										onClick={() => this.showAddSetToGroup()}
										icon={<GroupAddRoundedIcon />}
										className="button--round"
										title="Add to group"
									></Button>
									{
										this.state.set.owner === this.state.user.uid &&
										<LinkButton
											to={`/sets/${this.props.match.params.setId}/edit`}
											icon={<EditRoundedIcon />}
											className="button--round"
											title="Edit"
										></LinkButton>
									}
									{
										this.state.set.owner === this.state.user.uid && this.state.currentSetGroups.length === 0 &&
										<Button
											onClick={() => this.showDeleteSet()}
											icon={<DeleteRoundedIcon />}
											className="button--round"
											title="Delete"
										></Button>
									}
								</div>
							</div>

							<div className="vocab-list">
								<div className="vocab-list-header">
									<h3>Terms</h3>
									<h3>Definitions</h3>
								</div>

								{this.state.set.vocab.map((contents, index) =>
									<div className="vocab-row" key={index}>
										<span>{contents.term}</span>
										<span>{contents.definition}</span>
									</div>
								)}
							</div>
						</main>
						<Footer />
						
						{
							this.state.showAddSetToGroup
							?
							<>
								<div className="overlay" onClick={this.hideAddSetToGroup}></div>
								<div className="overlay-content set-page-group-overlay-content">
									{
										Object.keys(this.state.groups).length < 1
										?
										<>
											<h1>No Groups Found</h1>
											<span>This could be because:</span>
											<ul className="no-groups-message-list">
												<li>you're not a member of any groups</li>
												<li>this set is already a part of your groups</li>
												<li>you don't have the required permissions</li>
											</ul>
											<p>To add sets to a group, you must be an owner or collaborator.</p>
										</>
										:
										<>
											<h1>Select a Group</h1>

											<div className="set-page-overlay-group-container">
												{
													Object.keys(this.state.groups).map((groupId) =>
														<Button
															onClick={() => this.addSetToGroup(groupId)}
															className="button--no-background"
															loading={this.state.addSetToGroupLoading[groupId]}
															disabled={!this.state.canAddSetToGroup}
															key={groupId}
														>{this.state.groups[groupId]}</Button>
													)
												}
											</div>
										</>
									}

									<Button
										onClick={this.hideAddSetToGroup}
										icon={<CloseRoundedIcon />}
										className="button--no-background popup-close-button"
									></Button>
								</div>
							</>
							:
							this.state.showDeleteConfirmation &&
							<ConfirmationDialog
								yesFunction={this.deleteSet}
								noFunction={this.hideDeleteConfirmation}
								message="Are you sure you want to delete this set?"
							/>
						}

						{
							this.state.showTestStart &&
							<TestStart
								hideTestStart={this.hideTestStart}
								showIndividualTestPrompt={this.showIndividualTestPrompt}
								loading={this.state.loading}
							/>
						}
						{
							this.state.showClassicTestStart &&
							<ClassicTestStart
								hide={this.hideClassicTestStart}
								startTest={this.startTest}
								max={this.state.totalTestQuestions}
								sliderValue={this.state.sliderValue}
								onSliderChange={this.changeSliderValue}
								switchLanguage={this.state.switchLanguage}
								handleSwitchLanguageChange={this.handleSwitchLanguageChange}
								loading={this.state.loading}
								disabled={!this.state.canStartTest}
							/>
						}
						{
							this.state.showLivesTestStart &&
							<LivesTestStart
								hide={this.hideLivesTestStart}
								startTest={this.startTest}
								max={20}
								sliderValue={this.state.sliderValue}
								onSliderChange={this.changeSliderValue}
								switchLanguage={this.state.switchLanguage}
								handleSwitchLanguageChange={this.handleSwitchLanguageChange}
								loading={this.state.loading}
								disabled={!this.state.canStartTest}
							/>
						}
						{
							this.state.showCountdownTestStart &&
							<CountdownTestStart
								hide={this.hideCountdownTestStart}
								startTest={this.startTest}
							/>
						}
					</>
				}
			</div>
		)
	}
})
