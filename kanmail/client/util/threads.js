import _ from 'lodash';

import { getEmailStore } from 'stores/emailStoreProxy.js';


export function moveOrCopyThread(moveData, targetFolder, copy=false) {
    const { messageUids, oldColumn, accountName } = moveData;
    const emailStore = getEmailStore();

    let handler = copy ? emailStore.copyEmails : emailStore.moveEmails;

    handler(
        accountName,
        messageUids,
        oldColumn,
        targetFolder,
    ).then(() => {
        emailStore.syncFolderEmails(
            oldColumn,
            {accountName: accountName},
        );
        emailStore.syncFolderEmails(
            targetFolder,
            {
                accountName: accountName,
                // Tell the backend to expect X messages (and infer if needed!)
                query: {uid_count: messageUids.length},
            },
        );
    });
}


/*
    Return a list of UIDs for a given folder in this thread.
*/
export function getThreadColumnMessageIds(thread, columnId) {
    return _.filter(_.map(thread, message => (
        message.folderUids[columnId]
    )));
}


export function getMoveDataFromThreadComponent(component) {
    const { props } = component;

    // Get account name from the first message in the thread
    const { account_name } = props.thread[0];

    // Get list of message UIDs *for this folder*
    const messageUids = getThreadColumnMessageIds(
        props.thread,
        props.columnId,
    );

    return {
        messageUids: messageUids,
        oldColumn: props.columnId,
        accountName: account_name,
        sourceThreadComponent: component,
    };
}


function getThreadComponent(sourceComponent, propName) {
    let component;

    while (sourceComponent) {
        const nextComponent = sourceComponent.props[propName]();

        if (!nextComponent || !nextComponent.isBusy()) {
            component = nextComponent;
            break;
        }

        sourceComponent = nextComponent;
    }

    return component;
}

export const getNextThreadComponent = (thread) => getThreadComponent(thread, 'getNextThread');
export const getPreviousThreadComponent = (thread) => getThreadComponent(thread, 'getPreviousThread');


function collectVisibleThreadComponents(threadRefs) {
    return _.reduce(
        threadRefs,
        (memo, value) => {
            if (value) {
                const component = value.getDecoratedComponentInstance();
                if (!component.isBusy()) {
                    memo.push(component);
                }
            }
            return memo;
        },
        [],
    );
}

function getColumnThreadComponent(sourceComponent, propName) {
    const targetColumn = sourceComponent.props[propName]();

    if (targetColumn) {
        const sourceColumn = sourceComponent.props.column;

        const visibleTargetThreads = collectVisibleThreadComponents(targetColumn.threadRefs);
        const visibleSourceThreads = collectVisibleThreadComponents(sourceColumn.threadRefs);

        let wantedSourceThreadRef = visibleSourceThreads.indexOf(sourceComponent);

        if (wantedSourceThreadRef >= 0) {
            if (wantedSourceThreadRef > visibleTargetThreads.length - 1) {
                wantedSourceThreadRef = visibleTargetThreads.length - 1;
            }
            return visibleTargetThreads[wantedSourceThreadRef];
        }
    }
}

export const getNextColumnThreadComponent = (thread) => getColumnThreadComponent(thread, 'getNextColumn');
export const getPreviousColumnThreadComponent = (thread) => getColumnThreadComponent(thread, 'getPreviousColumn');
