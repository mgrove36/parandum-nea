import React, { Component } from 'react';
import { withRouter, Link } from 'react-router-dom';
import { HomeRounded as HomeRoundedIcon, EditRounded as EditRoundedIcon } from "@material-ui/icons";
import NavBar from "./NavBar";
import Footer from "./Footer";

import "./css/UserSets.css";

export default withRouter(class UserSets extends Component {
	constructor(props) {
		super(props);
		this.state = {
			user: props.user,
			db: props.db,
			functions: {
				createProgress: props.functions.httpsCallable("createProgress"),
			},
			canStartTest: false,
			loading: false,
			selections: {},
			navbarItems: [
				{
					type: "link",
					link: "/",
					icon: <HomeRoundedIcon />,
					hideTextMobile: true,
				}
			],
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
		document.title = "Sets | Parandum";

		const userSetsRef = this.state.db.collection("sets")
			.where("owner", "==", this.state.user.uid)
			.orderBy("title");

		userSetsRef.get().then((querySnapshot) => {
			this.setState({
				userSets: querySnapshot.docs,
			});
			this.props.page.load();
		});

		this.props.logEvent("page_view");
	}

	componentWillUnmount() {
		this.isMounted = false;
		this.props.page.unload();
	}

	render() {
		return (
			<div>
				<NavBar items={this.state.navbarItems} />

				<main>
					<h1>My Sets</h1>
					<div className="user-sets-list">
						{
							this.state.userSets && this.state.userSets.length > 0
							?
							this.state.userSets
								.map((set, index) =>
									<div className="user-sets-row" key={index}>
										<Link
											to={`/sets/${set.id}`}
										>
											{set.data().title}
										</Link>
										<Link
											to={`/sets/${set.id}/edit`}
										>
											<EditRoundedIcon />
										</Link>
									</div>
								)
							:
							<p>You haven't made any sets yet!</p>
						}
					</div>
				</main>
				<Footer />
			</div>
		)
	}
})
