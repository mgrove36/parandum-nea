import React, { Component } from 'react';
import { HomeRounded as HomeRoundedIcon, GroupAddRounded as GroupAddRoundedIcon, GroupRounded as GroupRoundedIcon, CloseRounded as CloseRoundedIcon, ArrowForwardRounded as ArrowForwardRoundedIcon, PersonRounded as PersonRoundedIcon, EditRounded as EditRoundedIcon, VisibilityRounded as VisibilityRoundedIcon } from "@material-ui/icons";
import NavBar from "./NavBar";
import Button from "./Button";
import Footer from "./Footer";
import { withRouter, Link } from "react-router-dom";

import "./css/PopUp.css";
import "./css/UserGroups.css";

export default withRouter(class UserGroups extends Component {
	constructor(props) {
		super(props);
		this.state = {
			user: props.user,
			db: props.db,
			functions: {
				createGroup: props.functions.httpsCallable("createGroup"),
			},
			navbarItems: [
				{
					type: "link",
					link: "/",
					icon: <HomeRoundedIcon />,
					hideTextMobile: true,
				}
			],
			createGroup: false,
			joinGroup: false,
			groupName: "",
			joinCode: "",
			canCreateGroup: false,
			canJoinGroup: false,
			canFindGroup: true,
			userGroups: null,
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
		document.title = "Groups | Parandum";

		const userGroupsRef = this.state.db.collection("users")
			.doc(this.state.user.uid)
			.collection("groups")
			.orderBy("role");

		userGroupsRef.get().then(async (querySnapshot) => {
			let newState = {
				userGroups: {},
			};

			await Promise.all(querySnapshot.docs.map((userGroupDoc) => {
				return this.state.db
					.collection("groups")
					.doc(userGroupDoc.id)
					.get()
					.then((groupDoc) => {
						if (userGroupDoc.data() && groupDoc.data()) newState.userGroups[userGroupDoc.id] = {
							role: userGroupDoc.data().role,
							displayName: groupDoc.data().display_name,
							setCount: groupDoc.data().sets.length,
							memberCount: Object.keys(groupDoc.data().users).length,
						};
					});
			}));

			this.setState(newState);
			this.props.page.load();
		});

		this.props.logEvent("page_view");
	}

	componentWillUnmount() {
		this.isMounted = false;
		this.props.page.unload();
	}

	showJoinGroup = () => {
		this.setState({
			joinGroup: true,
		}, () => this.joinCodeInput.focus());
	}
	
	hideJoinGroup = () => {
		this.setState({
			joinGroup: false,
		});
	}

	showCreateGroup = () => {
		this.setState({
			createGroup: true,
		}, () => this.groupNameInput.focus());
	}

	hideCreateGroup = () => {
		this.setState({
			createGroup: false,
		});
	}

	createGroup = () => {
		if (this.state.canCreateGroup) {
			this.startCreateGroupLoading();

			this.state.functions.createGroup(this.state.groupName)
				.then((result) => {
					this.props.history.push(`/groups/${result.data}`);
					this.stopCreateGroupLoading();

					this.props.logEvent("create_group", {
						group_id: result.data,
					});
				}).catch((error) => {
					console.log(`Couldn't create group: ${error}`);
					this.stopCreateGroupLoading();
				});
		}
	}

	joinGroup = () => {
		if (this.state.canJoinGroup) {
			this.startJoinGroupLoading();

			this.state.db.collection("join_codes")
				.doc(this.state.joinCode)
				.get()
				.then((joinCodeDoc) => {
					this.state.db.collection("users")
						.doc(this.state.user.uid)
						.collection("groups")
						.doc(joinCodeDoc.data().group)
						.set({
							role: "member",
						}).then(() => {
							this.props.history.push(`/groups/${joinCodeDoc.data().group}`);
							this.stopJoinGroupLoading();
						});
				}).catch((error) => {
					this.stopJoinGroupLoading(false);
				});
		}

	}

	handleGroupNameChange = (event) => {
		this.setState({
			groupName: event.target.value,
			canCreateGroup: event.target.value.replace(" ", "") !== "",
		});
	}

	handleJoinCodeChange = (event) => {
		this.setState({
			joinCode: event.target.value,
			canJoinGroup: event.target.value.replace(" ", "") !== "",
			canFindGroup: true,
		});
	}

	startJoinGroupLoading = () => {
		this.setState({
			loading: true,
			canJoinGroup: false,
		});
	}

	stopJoinGroupLoading = (canFindGroup = true) => {
		let newState = {
			loading: false,
			canJoinGroup: true,
		};
		if (!canFindGroup) newState.canFindGroup = false;
		this.setState(newState);
	}

	startCreateGroupLoading = () => {
		this.setState({
			loading: true,
			canCreateGroup: false,
		});
	}

	stopCreateGroupLoading = () => {
		this.setState({
			loading: false,
			canCreateGroup: true,
		});
	}

	handleGroupNameInputKeypress = (event) => {
		if (event.key === "Enter") {
			this.createGroup();
		}
	}

	handleJoinCodeInputKeypress = (event) => {
		if (event.key === "Enter") {
			this.joinGroup();
		}
	}

	render() {
		return (
			<div>
				<NavBar items={this.state.navbarItems} />
				<main>
					<div className="page-header">
						<h1>Groups</h1>
						<div className="button-container">
							<Button
								onClick={this.showJoinGroup}
								icon={<GroupRoundedIcon />}
							>
								Join
							</Button>
							<Button
								onClick={this.showCreateGroup}
								icon={<GroupAddRoundedIcon />}
							>
								Create
							</Button>
						</div>
					</div>

					{
						this.state.userGroups && Object.keys(this.state.userGroups).length > 0
						?
						<>
							<div className="user-groups-list">
								{Object.keys(this.state.userGroups)
									.sort((a, b) => {
										if (this.state.userGroups[a].displayName < this.state.userGroups[b].displayName) {
											return -1;
										}
										if (this.state.userGroups[a].displayName > this.state.userGroups[b].displayName) {
											return 1;
										}
										return 0;
									})
									.map((groupId, index) =>
									<Link
										to={`/groups/${groupId}`}
										key={index}
									>
										{this.state.userGroups[groupId].displayName}
										<span className="user-group-role-icon">
											{
												this.state.userGroups[groupId].role === "owner"
												?
												<PersonRoundedIcon />
												:
												this.state.userGroups[groupId].role === "contributor"
												?
												<EditRoundedIcon />
												:
												<VisibilityRoundedIcon />
											}
										</span>
									</Link>
								)}
							</div>
						</>
						:
						<h4>You aren't a member of any groups</h4>
					}
				</main>
				<Footer />
				
				{
					this.state.createGroup
					?
					<>
					<div className="overlay" onClick={this.hideCreateGroup}></div>
					<div className="overlay-content user-groups-overlay-content">
						<h1>Create Group</h1>

						<div className="user-groups-overlay-input-container">
							<input
								type="text"
								onChange={this.handleGroupNameChange}
								value={this.state.groupName}
								placeholder="Group Name"
								onKeyDown={this.handleGroupNameInputKeypress}
								ref={inputEl => (this.groupNameInput = inputEl)}
								autoComplete="off"
							/>
							<Button
								onClick={this.createGroup}
								icon={<ArrowForwardRoundedIcon />}
								className="button--round"
								loading={this.state.loading}
								disabled={!this.state.canCreateGroup}
							></Button>
						</div>

						<Button
							onClick={this.hideCreateGroup}
							icon={<CloseRoundedIcon />}
							className="button--no-background popup-close-button"
						></Button>
					</div>
					</>
					:
					this.state.joinGroup &&
					<>
					<div className="overlay" onClick={this.hideJoinGroup}></div>
					<div className="overlay-content user-groups-overlay-content">
						<h1>Join Group</h1>

						<div className="user-groups-overlay-input-container">
							<input
								type="text"
								onChange={this.handleJoinCodeChange}
								value={this.state.joinCode}
								placeholder="Join Code"
								onKeyDown={this.handleJoinCodeInputKeypress}
								ref={inputEl => (this.joinCodeInput = inputEl)}
								autoComplete="off"
							/>
							<Button
								onClick={this.joinGroup}
								icon={<ArrowForwardRoundedIcon />}
								className="button--round"
								loading={this.state.loading}
								disabled={!this.state.canJoinGroup}
							></Button>
						</div>

						{
							!this.state.canFindGroup &&
							<p>Can't find that group!</p>
						}

						<Button
							onClick={this.hideJoinGroup}
							icon={<CloseRoundedIcon />}
							className="button--no-background popup-close-button"
						></Button>
					</div>
					</>
				}
			</div>
		)
	}
})
