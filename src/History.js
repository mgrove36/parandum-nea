import React, { Component } from 'react';
import { TimelineRounded as TimelineRoundedIcon, HomeRounded as HomeRoundedIcon, QuestionAnswerRounded as QuestionAnswerRoundedIcon, PeopleRounded as PeopleRoundedIcon, SwapHorizRounded as SwapHorizRoundedIcon, DeleteRounded as DeleteRoundedIcon } from "@material-ui/icons";
import NavBar from "./NavBar";
import Button from "./Button";
import Footer from "./Footer";
import LineChart from "./LineChart";
import { Link } from 'react-router-dom';
import "./css/History.css";
import "./css/Chart.css";

export default class History extends Component {
	constructor(props) {
		super(props);
		this.state = {
			user: props.user,
			db: props.db,
			navbarItems: [
				{
					type: "link",
					name: "Mistakes",
					link: "/history/mistakes",
					icon: <TimelineRoundedIcon />,
					hideTextMobile: true,
				},
				{
					type: "link",
					link: "/",
					icon: <HomeRoundedIcon />,
					hideTextMobile: true,
				}
			],
			progressHistoryComplete: [],
			progressHistoryIncomplete: [],
			totalTime: 0,
			totalCorrect: 0,
			totalIncorrect: 0,
			totalMarks: 0,
			totalPercentage: 0,
			totalCompleteTests: 0,
			userMarkHistory: [],
			userSetHistory: [],
			personalSetsCount: 0,
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
		document.title = "History | Parandum";
		
		const userSets = this.state.db
		.collection("sets")
		.where("owner", "==", this.state.user.uid)
		.orderBy("title", "asc")
		.get();
		
		this.state.db.collection("progress")
		.where("uid", "==", this.state.user.uid)
		.orderBy("start_time", "desc")
		.get()
		.then(async (querySnapshot) => {
			let complete = [];
			let incomplete = [];
			let totalCorrect = 0;
			let totalIncorrect = 0;
			let totalMarks = 0;
			let totalTime = 0;
			let totalPercentage = 0;
			let userMarkHistory = [];
			let userSetHistory = [];
			
			querySnapshot.docs.map((doc) => {
				const data = doc.data();
				const pushData = {
					id: doc.id,
					setTitle: data.set_title,
					switchLanguage: data.switch_language,
					percentageProgress: (data.progress / data.questions.length * 100).toFixed(2),
					grade: (data.progress > 0 ? data.correct.length / data.progress * 100 : 0).toFixed(2),
					mode: data.mode,
					correct: data.correct.length,
					progress: data.progress,
				};
				
				totalCorrect += data.correct.length;
				totalIncorrect += data.incorrect.length;
				totalMarks += data.progress;
				
				if (data.duration !== null) {
					totalPercentage += (data.correct.length / data.questions.length * 100);
					totalTime += data.duration;
					userMarkHistory.push({
						x: new Date(data.start_time),
						y: (data.correct.length / data.questions.length * 100),
					});
					userSetHistory.push(data.set_title);
					return complete.push(pushData);
				} else {
					return incomplete.push(pushData);
				}
			});
			
			this.setState({
				progressHistoryComplete: complete,
				progressHistoryIncomplete: incomplete,
				totalCorrect: totalCorrect,
				totalIncorrect: totalIncorrect,
				totalMarks: totalMarks,
				totalTime: totalTime,
				totalPercentage: totalPercentage,
				totalCompleteTests: complete.length,
				userMarkHistory: userMarkHistory,
				userSetHistory: userSetHistory,
				personalSetsCount: (await userSets).docs.length,
			});
			this.props.page.load();
		}).catch((error) => {
			console.log(`Couldn't retrieve progress history: ${error}`);
			this.props.page.load();
		});

		this.props.logEvent("page_view");
	}

	componentWillUnmount() {
		this.isMounted = false;
		this.props.page.unload();
	}

	deleteProgress = (progressId) => {
		this.state.db.collection("progress")
			.doc(progressId)
			.delete()
			.then(() => {
				const progressIndex = this.state.progressHistoryIncomplete.map((obj) => obj.id).indexOf(progressId);
				let newState = {
					progressHistoryIncomplete: this.state.progressHistoryIncomplete,
				};
				newState.progressHistoryIncomplete.splice(progressIndex, 1);
				this.setState(newState);
			});
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

	render() {
		return (
			<div>
				<NavBar items={this.state.navbarItems} />
				<main>
					<h1>History</h1>

					<div className="history-sections">
						<div className="historical-user-stats-container">
							<div className="stat-row stat-row--inline">
								<h1>{this.state.totalCorrect}</h1>
								<p>correct</p>
							</div>
							<div className="stat-row stat-row--inline">
								<h1>{this.state.totalIncorrect}</h1>
								<p>incorrect</p>
							</div>
							<div className="stat-row stat-row--inline">
								<h1>{`${(this.state.totalCompleteTests > 0 ? (this.state.totalPercentage / this.state.totalCompleteTests) : 0).toFixed(2)}%`}</h1>
								<p>average</p>
							</div>
							<div className="stat-row stat-row--inline">
								<h1>{this.msToTime(this.state.totalTime)}</h1>
								<p>total time</p>
							</div>
							<div className="stat-row stat-row--inline">
								<h1>{this.state.totalCompleteTests}</h1>
								<p>tests completed</p>
							</div>
							<div className="stat-row stat-row--inline">
								<h1>{this.state.personalSetsCount}</h1>
								<p>personal set{ this.state.personalSetsCount !== 1 && "s"}</p>
							</div>
						</div>

						{ this.state.userMarkHistory && this.state.userMarkHistory.length > 1 &&
							<LineChart data={this.state.userMarkHistory} sets={this.state.userSetHistory} />
						}

						{
							this.state.progressHistoryComplete.length > 0 || this.state.progressHistoryIncomplete.length > 0
								?
								<div>
									{
										this.state.progressHistoryIncomplete.length > 0 &&
										<>
											<h2>Incomplete</h2>
											<div className="progress-history-container progress-history-container--incomplete">
												<div>
													<h3>Set</h3>
													<h3>Progress</h3>
													<h3>Mark</h3>
													<h3>Grade</h3>
													<h3>Mode</h3>
													<span></span>
												</div>
												{
													this.state.progressHistoryIncomplete.map((progressItem) =>
														<div key={progressItem.id}>
															<Link
																to={`/progress/${progressItem.id}`}
															>
																{progressItem.setTitle}
																{
																	progressItem.switchLanguage &&
																	<SwapHorizRoundedIcon />
																}
															</Link>
															<p>{progressItem.percentageProgress}%</p>
															<p>{progressItem.correct}/{progressItem.progress}</p>
															<p>{progressItem.grade}%</p>
															<p>
																{
																	progressItem.mode === "questions"
																	?
																	<QuestionAnswerRoundedIcon />
																	:
																	<PeopleRoundedIcon />
																}
															</p>
															<p>
																<Button
																	className="button--no-background"
																	onClick={() => this.deleteProgress(progressItem.id)}
																	icon={<DeleteRoundedIcon />}
																	title="Delete"
																></Button>
															</p>
														</div>
													)
												}
											</div>
										</>
									}
									{
										this.state.progressHistoryComplete.length > 0 &&
										<>
											<h2>Completed</h2>
											<div className="progress-history-container progress-history-container--complete">
												<div>
													<h3>Set</h3>
													<h3>Mark</h3>
													<h3>Grade</h3>
													<h3>Mode</h3>
												</div>
												{
													this.state.progressHistoryComplete.map((progressItem) =>
														<div key={progressItem.id}>
															<Link
																to={`/progress/${progressItem.id}`}
															>
																{progressItem.setTitle}
																{
																	progressItem.switchLanguage &&
																	<SwapHorizRoundedIcon />
																}
															</Link>
															<p>{progressItem.correct}/{progressItem.progress}</p>
															<p>{progressItem.grade}%</p>
															<p>
																{
																	progressItem.mode === "questions"
																	?
																	<QuestionAnswerRoundedIcon />
																	:
																	<PeopleRoundedIcon />
																}
															</p>
														</div>
													)	
												}
											</div>
										</>
									}
								</div>
								:
								<div>
									<p>You haven't done any tests yet.</p>
								</div>
						}
					</div>
				</main>
				<Footer />
			</div>
		)
	}
}
