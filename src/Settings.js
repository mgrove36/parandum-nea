import React, { Component } from 'react';
import { HomeRounded as HomeRoundedIcon } from "@material-ui/icons";
import NavBar from "./NavBar";
import Button from "./Button";
import { withRouter } from "react-router-dom";
import SettingsContent from "./SettingsContent";
import Footer from "./Footer";

export default withRouter(class Settings extends Component {
	constructor(props) {
		super(props);
		this.state = {
			user: props.user,
			db: props.db,
			navbarItems: [
				{
					type: "link",
					link: "/",
					icon: <HomeRoundedIcon />,
					hideTextMobile: true,
				}
			],
			soundInput: this.props.sound,
			themeInput: this.props.theme,
			coloredEdgesInput: this.props.coloredEdges,
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
		document.title = "Settings | Parandum";

		this.props.page.load();

		this.props.logEvent("page_view");
	}

	componentWillUnmount() {
		this.isMounted = false;
		this.props.page.unload();
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
		this.props.history.push("/");
	}

	render() {
		return (
			<div>
				<NavBar items={this.state.navbarItems} />
				<main>
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
				</main>
				<Footer showTerms={true} />
			</div>
		)
	}
})
