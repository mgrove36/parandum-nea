import React, { Component } from 'react';
import { withRouter, Link } from "react-router-dom";
import { TimelineRounded as TimelineRoundedIcon, HomeRounded as HomeRoundedIcon, EditRounded as EditRoundedIcon, ArrowForwardRounded as ArrowForwardRoundedIcon, DeleteRounded as DeleteRoundedIcon } from "@material-ui/icons";
import NavBar from "./NavBar";
import Button from "./Button";
import LinkButton from "./LinkButton";
import Footer from "./Footer";
import Error404 from "./Error404";
import ConfirmationDialog from './ConfirmationDialog';

import "./css/GroupPage.css";
import "./css/ConfirmationDialog.css";
import "./css/OptionsListOverlay.css";

export default withRouter(class GroupPage extends Component {
	constructor(props) {
		super(props);
		this.state = {
			user: props.user,
			db: props.db,
			functions: {
				removeSetFromGroup: props.functions.httpsCallable("removeSetFromGroup"),
				getGroupMembers: props.functions.httpsCallable("getGroupMembers"),
			},
			navbarItems: [
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
			memberCount: null,
			joinCode: "",
			editGroupName: false,
			loading: false,
			groupUsers: {
				owners: [],
				contributors: [],
				members: [],
			},
			editingUser: null,
			showDeleteGroup: false,
			deleteGroupLoading: false,
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
		let promises = [];
		let newState = {
			sets: {},
		};

		promises.push(
			this.state.db
				.collection("users")
				.doc(this.state.user.uid)
				.collection("groups")
				.doc(this.props.match.params.groupId)
				.get()
				.then((userGroupDoc) => {
					if (userGroupDoc.data().role === "owner") {
						return this.state.functions
							.getGroupMembers({ groupId: this.props.match.params.groupId })
							.then((response) => {
								newState.groupUsers = response.data;
								return userGroupDoc.data();
							})
							.catch((error) => {
								newState.groupUsers = {
									owners: [
										{
											displayName: this.state.user.displayName,
											uid: this.state.user.uid,
										}
									],
									contributors: [],
									members: [],
								};
								return userGroupDoc.data();
							});
					}
					return userGroupDoc.data();
				})
				.catch((error) => {
					console.log(`Can't access user group: ${error}`);
					return {
						role: "none",
					};
				})
		);

		promises.push(
			this.state.db
				.collection("groups")
				.doc(this.props.match.params.groupId)
				.get()
				.then(async (groupDoc) => {
					await Promise.all(groupDoc.data().sets.map((setId) => {
						return this.state.db.collection("sets")
							.doc(setId)
							.get()
							.then((doc) => {
								newState.sets[setId] = {
									displayName: doc.data().title,
									loading: false,
								};
							});
					}));

					return groupDoc.data();
				}).catch((error) => {
					console.log(`Can't access group: ${error}`);
					return {
						display_name: "",
						users: {},
						join_code: "",
					};
				})
		);

		const completedPromises = await Promise.all(promises);

		document.title = `${completedPromises[1].display_name} | Parandum`;

		newState.role = completedPromises[0].role;
		newState.groupName = completedPromises[1].display_name;
		newState.originalGroupName = completedPromises[1].display_name;
		newState.memberCount = Object.keys(completedPromises[1].users).length + (Object.keys(completedPromises[1].users).includes(this.state.user.uid) ? 0 : 1);
		newState.joinCode = completedPromises[0].role === "owner" ? completedPromises[1].join_code : "";

		this.setState(newState);
		this.props.page.load();

		this.props.logEvent("select_content", {
			content_type: "group",
			item_id: this.props.match.params.groupId,
		});
	}

	componentWillUnmount() {
		this.isMounted = false;
		this.props.page.unload();
	}

	editGroupName = () => {
		this.setState({
			editGroupName: true,
		}, () => this.groupNameInput.focus());
	}

	handleGroupNameChange = (event) => {
		this.setState({
			groupName: event.target.value,
		});
	}

	handleInputKeypress = (event) => {
		if (event.key === "Enter") {
			this.renameGroup();
		} else if (event.key === "Escape") {
			this.cancelGroupRename();
		}
	}

	stopLoading = () => {
		this.setState({
			loading: false,
			editGroupName: false,
		})
	}

	cancelGroupRename = () => {
		this.setState({
			editGroupName: false,
			groupName: this.state.originalGroupName,
		})
	}

	renameGroup = () => {
		if (!this.state.loading && this.state.groupName.replace(" ", "") !== "") {
			if (this.state.groupName.trim() === this.state.originalGroupName) {
				this.cancelGroupRename();
			} else {
				this.setState({
					loading: true,
				});
	
				this.state.db.collection("groups")
					.doc(this.props.match.params.groupId)
					.update({
						display_name: this.state.groupName.trim(),
					}).then(() => {
						this.stopLoading();
					}).catch((error) => {
						console.log(`Couldn't update group name: ${error}`);
						this.setState({
							loading: false,
							groupName: this.state.originalGroupName,
							editGroupName: false,
						});
					});
			}
		}
	}

	removeSet = (setId) => {
		let newLoadingState = {
			sets: this.state.sets,
		};
		newLoadingState.sets[setId].loading = true;
		this.setState(newLoadingState);

		this.state.functions.removeSetFromGroup({
			groupId: this.props.match.params.groupId,
			setId: setId,
		}).then(() => {
			let newState = {
				sets: this.state.sets,
			};
			delete newState.sets[setId];
			this.setState(newState);
		}).catch((error) => {
			console.log(`Can't remove set from group: ${error}`);
			newLoadingState.sets[setId].loading = false;
			this.setState(newLoadingState);
		});
	}

	showEditUserRole = (role, index) => {
		let user;
		if (role === "owner") {
			user = this.state.groupUsers.owners[index];
		} else if (role === "contributor") {
			user = this.state.groupUsers.contributors[index];
		} else {
			user = this.state.groupUsers.members[index];
		}
		this.setState({
			editingUser: {
				uid: user.uid,
				role: role,
				index: index,
			},
		});
	}

	hideEditUserRole = () => {
		this.setState({
			editingUser: null,
		});
	}

	editUserRole = (role) => {
		if (role === this.state.editingUser.role) {
			this.setState({
				editingUser: null,
			});
		} else {
			if (role === "remove") {
				this.state.db.collection("users")
					.doc(this.state.editingUser.uid)
					.collection("groups")
					.doc(this.props.match.params.groupId)
					.delete()
					.then(() => {
						let groupUsers = this.state.groupUsers;
						if (this.state.editingUser.role === "owner") {
							groupUsers.owners.splice(this.state.editingUser.index, 1);
						} else if (this.state.editingUser.role === "contributor") {
							groupUsers.contributors.splice(this.state.editingUser.index, 1);
						} else {
							groupUsers.members.splice(this.state.editingUser.index, 1);
						}
						this.setState({
							editingUser: null,
							groupUsers: groupUsers,
						});
					}).catch((error) => {
						this.setState({
							editingUser: null,
						});
						console.log(`Couldn't change user role: ${error}`)
					});
			} else {
				this.state.db.collection("users")
					.doc(this.state.editingUser.uid)
					.collection("groups")
					.doc(this.props.match.params.groupId)
					.update({
						role: role,
					}).then(() => {
						let groupUsers = this.state.groupUsers;
						let userData;
						if (this.state.editingUser.role === "owner") {
							userData = groupUsers.owners.splice(this.state.editingUser.index, 1)[0];
						} else if (this.state.editingUser.role === "contributor") {
							userData = groupUsers.contributors.splice(this.state.editingUser.index, 1)[0];
						} else {
							userData = groupUsers.members.splice(this.state.editingUser.index, 1)[0];
						}
						if (role === "owner") {
							groupUsers.owners.push(userData);
						} else if (role === "contributor") {
							groupUsers.contributors.push(userData);
						} else {
							groupUsers.members.push(userData);
						}
						this.setState({
							editingUser: null,
							groupUsers: groupUsers,
						});
					}).catch((error) => {
						this.setState({
							editingUser: null,
						});
						console.log(`Couldn't change user role: ${error}`)
					});
			}
		}
	}

	showDeleteGroup = () => {
		this.setState({
			showDeleteGroup: true,
		});
	}

	hideDeleteGroup = () => {
		this.setState({
			showDeleteGroup: false,
		});
	}

	deleteGroup = () => {
		this.setState({
			deleteGroupLoading: true,
		});

		this.state.db.collection("groups")
			.doc(this.props.match.params.groupId)
			.delete()
			.then(() => {
				this.props.history.push("/groups");
			}).catch((error) => {
				console.log(`Couldn't delete group: ${error}`);
				this.setState({
					deleteGroupLoading: false,
				});
			})
	}

	render() {
		return (
			(this.state.role === "none") ?
			<Error404 />
			:
			<div>
				<NavBar items={this.state.navbarItems} />
				<main>
					{
						!(this.state.role === null) &&
						<>
							<div className="page-header">
								{
									this.state.editGroupName && this.state.role === "owner"
									?
									<h1 className="group-name-header-input-container">
										<input
											type="text"
											onChange={this.handleGroupNameChange}
											value={this.state.groupName}
											onKeyDown={this.handleInputKeypress}
											ref={inputEl => (this.groupNameInput = inputEl)}
											autoComplete="off"
										/>
										<Button
											onClick={this.renameGroup}
											icon={<ArrowForwardRoundedIcon />}
											className="button--round"
											disabled={this.state.loading || this.state.groupName.replace(" ", "") === ""}
											loading={this.state.loading}
										></Button>
									</h1>
									:
									<h1 onClick={this.state.role === "owner" ? this.editGroupName : () => {}}>
										{this.state.groupName}
										{
											this.state.role === "owner" &&
											<span className="group-edit-icon">
												<EditRoundedIcon />
											</span>
										}
									</h1>
								}
								{
									this.state.role === "owner" &&
									<div className="button-container">
										<LinkButton
											to={`/groups/${this.props.match.params.groupId}/stats`}
											icon={<TimelineRoundedIcon />}
											className="button--round"
											title="Group progress"
										></LinkButton>
										<Button
											onClick={this.showDeleteGroup}
											icon={<DeleteRoundedIcon />}
											className="button--round"
											title="Delete group"
										></Button>
									</div>
								}
							</div>
							{
								this.state.joinCode &&
								<div className="stat-row stat-row--inline">
									<p>Join code</p>
									<h2>{this.state.joinCode}</h2>
								</div>
							}
							{
								this.state.memberCount &&
								<div className="stat-row stat-row--inline">
									<h2>{this.state.memberCount}</h2>
									<p>
										member
										{ this.state.memberCount !== 1 && "s" }
									</p>
								</div>
							}
		
							<div>
								<h2>Sets</h2>
								{
									Object.keys(this.state.sets).length > 0
									?
									<div className="group-links-container">
										{
											Object.keys(this.state.sets)
												.sort((a, b) => {
													if (this.state.sets[a].displayName < this.state.sets[b].displayName) {
														return -1;
													}
													if (this.state.sets[a].displayName > this.state.sets[b].displayName) {
														return 1;
													}
													return 0;
												})
												.map((setId) =>
													<div key={setId} className="group-set-link">
														<Link
															to={`/sets/${setId}`}
														>
															{this.state.sets[setId].displayName}
														</Link>
														{
															this.state.role === "owner" &&
															<Button
																className="button--no-background"
																onClick={() => this.removeSet(setId)}
																icon={<DeleteRoundedIcon />}
																loading={this.state.sets[setId].loading}
																disabled={this.state.sets[setId].loading}
																title="Remove set"
															></Button>
														}
													</div>
												)
										}
									</div>
									:
									<p>
										This group doesn't have any sets yet!
									</p>
								}
							</div>
							{
								this.state.role === "owner" &&
								<>
									<div>
										<h2>Members</h2>
										{
											this.state.groupUsers && this.state.groupUsers.owners.length > 0 &&
											<>
												<h3 className="group-role-header">Owners</h3>
												<div className="group-links-container">
													{
														this.state.groupUsers.owners.map((user, index) =>
															<p
																key={user.uid}
																className={`group-set-link ${user.uid !== this.state.user.uid ? "group-set-link--enabled" : ""}`}
																onClick={user.uid === this.state.user.uid ? () => { } : () => this.showEditUserRole("owner", index)}
															>
																{
																	user.uid === this.state.user.uid
																	?
																	"You"
																	:
																	<>
																		{user.displayName}
																		<EditRoundedIcon />
																	</>
																}
															</p>
														)
													}
												</div>
											</>
										}
										{
											this.state.groupUsers && this.state.groupUsers.contributors.length > 0 &&
											<>
												<h3 className="group-role-header">Contributors</h3>
												<div className="group-links-container">
													{
														this.state.groupUsers.contributors.map((user, index) =>
															<p
																key={user.uid}
																className={`group-set-link ${user.uid !== this.state.user.uid ? "group-set-link--enabled" : ""}`}
																onClick={user.uid === this.state.user.uid ? () => { } : () => this.showEditUserRole("contributor", index)}
															>
																{
																	user.uid === this.state.user.uid
																	?
																	"You"
																	:
																	<>
																		{user.displayName}
																		<EditRoundedIcon />
																	</>
																}
															</p>
														)
													}
												</div>
											</>
										}
										{
											this.state.groupUsers && this.state.groupUsers.members.length > 0 &&
											<>
												<h3 className="group-role-header">Members</h3>
												<div className="group-links-container">
													{
														this.state.groupUsers.members.map((user, index) =>
															<p
																key={user.uid}
																className={`group-set-link ${user.uid !== this.state.user.uid ? "group-set-link--enabled" : ""}`}
																onClick={user.uid === this.state.user.uid ? () => { } : () => this.showEditUserRole("member", index)}
															>
																{
																	user.uid === this.state.user.uid
																		?
																		"You"
																		:
																		<>
																			{user.displayName}
																			<EditRoundedIcon />
																		</>
																}
															</p>
														)
													}
												</div>
											</>
										}
									</div>
									{
										this.state.editingUser &&
										<>
											<div className="overlay" onClick={this.hideEditUserRole}></div>
											<div className="overlay-content options-list-overlay-content">
												{
													["Owner", "Contributor", "Member", "Remove"].map((role) =>
														<h3
															key={role}
															onClick={() => this.editUserRole(role.toLowerCase())}
														>
															{role}
														</h3>
													)
												}
		
												<div onClick={this.hideEditUserRole}>
													Cancel
												</div>
											</div>
										</>
									}
									{
										this.state.showDeleteGroup &&
										<ConfirmationDialog
											yesFunction={this.deleteGroup}
											noFunction={this.hideDeleteGroup}
											message="Are you sure you want to delete this group?"
										/>
									}
								</>
							}
						</>
					}
				</main>
				<Footer />
			</div>
		)
	}
})
