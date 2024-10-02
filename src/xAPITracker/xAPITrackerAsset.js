import ActorStatement from "./HighLevel/Statement/ActorStatement.js";
import ContextStatement from "./HighLevel/Statement/ContextStatement.js";
import Statement from "./HighLevel/Statement/Statement.js";
import XAPI from "https://cdn.skypack.dev/@xapi/xapi";

export default class xAPITrackerAsset {
    constructor(endpoint, auth, homePage, token, defaultUri) {
        this.updateAuth(endpoint, auth, homePage, token, defaultUri);
    }

    updateAuth(endpoint, auth, homePage, token, defaultUri) {
        this.online=false;
        this.endpoint = endpoint;
        this.auth = auth;
        this.homePage = homePage;
        this.token = token;
        this.actor=new ActorStatement(token, token, homePage);
        this.context = new ContextStatement();
        if(this.auth != null) {
            this.xapi = new XAPI({
                endpoint: endpoint,
                auth: auth
            });
        }
        this.defaultUri=defaultUri;
        this.statementsToSend=[];
        if(this.auth) { 
            this.online=true;
            console.log("XAPI Tracker for Serious Games Online");
            if(this.statementsToSend.length > 0) {
                this.sendEnqueuedStatements();
            }
        } else {
            console.log("XAPI Tracker for Serious Games Offline");
        }
    }
    
    xapi;
    endpoint;
    auth;
    homePage;
    token;
    defaultUri;
    statementsToSend=[];
    
    Trace(verbId, objectType, objectId) {
        var statement=new Statement(this.actor, verbId, objectId, objectType, this.context, this.defaultUri);
        return statement;
    }

    async sendEnqueuedStatements() {
        await this.xapi.sendStatements({statements: this.statementsToSend})
            .then((result) => {
                this.statementsToSend = [];
            }).catch(console.error);
    }

    async enqueue(statement) {
        console.debug(statement);
        if(this.online) {
            this.statementsToSend.push(statement);
            await this.xapi.sendStatements({statements: this.statementsToSend})
            .then((result) => {
                this.statementsToSend = [];
            }).catch(console.error);
        } else {
            this.statementsToSend.push(statement);
        };
    }
}