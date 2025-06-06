/**
 * Copyright (c) 2021-2025, WSO2 LLC. (https://www.wso2.com).
 *
 * WSO2 LLC. licenses this file to you under the Apache License,
 * Version 2.0 (the "License"); you may not use this file except
 * in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied. See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import { useRequiredScopes } from "@wso2is/access-control";
import { getProfileInformation } from "@wso2is/admin.authentication.v1/store";
import { AppConstants } from "@wso2is/admin.core.v1/constants/app-constants";
import { history } from "@wso2is/admin.core.v1/helpers/history";
import { FeatureConfigInterface } from "@wso2is/admin.core.v1/models/config";
import { AppState } from "@wso2is/admin.core.v1/store";
import { SCIMConfigs } from "@wso2is/admin.extensions.v1/configs/scim";
import { userstoresConfig } from "@wso2is/admin.extensions.v1/configs/userstores";
import { useGetCurrentOrganizationType } from "@wso2is/admin.organizations.v1/hooks/use-get-organization-type";
import { getGovernanceConnectors } from "@wso2is/admin.server-configurations.v1/api";
import { ServerConfigurationsConstants } from "@wso2is/admin.server-configurations.v1/constants";
import { ConnectorPropertyInterface, GovernanceConnectorInterface }
    from "@wso2is/admin.server-configurations.v1/models";
import { getUserDetails, updateUserInfo } from "@wso2is/admin.users.v1/api/users";
import { EditUser } from "@wso2is/admin.users.v1/components/edit-user";
import { UserManagementConstants } from "@wso2is/admin.users.v1/constants/user-management-constants";
import UserManagementProvider from "@wso2is/admin.users.v1/providers/user-management-provider";
import { UserManagementUtils } from "@wso2is/admin.users.v1/utils/user-management-utils";
import useUserStores from "@wso2is/admin.userstores.v1/hooks/use-user-stores";
import { isFeatureEnabled, resolveUserDisplayName, resolveUserEmails } from "@wso2is/core/helpers";
import {
    AlertInterface,
    AlertLevels,
    IdentifiableComponentInterface,
    MultiValueAttributeInterface,
    ProfileInfoInterface,
    emptyProfileInfo
}from "@wso2is/core/models";
import { addAlert } from "@wso2is/core/store";
import { EditAvatarModal, Popup, TabPageLayout, UserAvatar } from "@wso2is/react-components";
import React, { FunctionComponent, MouseEvent, ReactElement, useEffect, useMemo, useState } from "react";
import { Trans, useTranslation } from "react-i18next";
import { useDispatch, useSelector } from "react-redux";
import { Dispatch } from "redux";
import { Icon } from "semantic-ui-react";
import { ConsoleSettingsModes } from "../models/ui";

/**
 * Props interface of {@link ConsoleSettingsPage}
 */
type ConsoleAdministratorsEditPageInterface = IdentifiableComponentInterface;

/**
 * Email Domain Discovery page.
 *
 * @param props - Props injected to the component.
 * @returns Email Domain Discovery page component.
 */
const ConsoleAdministratorsEditPage: FunctionComponent<ConsoleAdministratorsEditPageInterface> = (
    props: ConsoleAdministratorsEditPageInterface
): ReactElement => {

    const { "data-componentid": componentId = "console-administrators-edit-page" } = props;

    const { t } = useTranslation();

    const dispatch: Dispatch<any> = useDispatch();

    const { isSuperOrganization } = useGetCurrentOrganizationType();
    const { isUserStoreReadOnly, readOnlyUserStoreNamesList } = useUserStores();

    const featureConfig: FeatureConfigInterface = useSelector((state: AppState) => state.config.ui.features);
    const profileInfo: ProfileInfoInterface = useSelector((state: AppState) => state.profile.profileInfo);
    const hasUsersUpdatePermissions: boolean = useRequiredScopes(featureConfig?.users?.scopes?.update);
    const isUserUpdateFeatureEnabled: boolean = isFeatureEnabled(
        featureConfig?.users, UserManagementConstants.FEATURE_DICTIONARY.get("USER_UPDATE"));
    const isUpdatingSharedProfilesFeatureEnabled: boolean = isFeatureEnabled(
        featureConfig?.users, UserManagementConstants.FEATURE_DICTIONARY.get("USER_SHARED_PROFILES"));

    const [ user, setUserProfile ] = useState<ProfileInfoInterface>(emptyProfileInfo);
    const [ isUserDetailsRequestLoading, setIsUserDetailsRequestLoading ] = useState<boolean>(false);
    const [ showEditAvatarModal, setShowEditAvatarModal ] = useState<boolean>(false);
    const [ connectorProperties, setConnectorProperties ] = useState<ConnectorPropertyInterface[]>(undefined);
    const [ isSubmitting, setIsSubmitting ] = useState<boolean>(false);

    /**
     * Checks if the user store is read only.
     */
    const isReadOnlyUserStore: boolean = useMemo(() => {
        const userStoreName: string = user?.userName?.split("/").length > 1
            ? user?.userName?.split("/")[0]
            : userstoresConfig.primaryUserstoreName;

        return isUserStoreReadOnly(userStoreName);
    }, [ user, readOnlyUserStoreNamesList ]);

    /**
     * Checks if the UI should be in read-only mode.
     */
    const isReadOnly: boolean = !isUserUpdateFeatureEnabled
        || !hasUsersUpdatePermissions
        || isReadOnlyUserStore
        || user[ SCIMConfigs.scim.systemSchema ]?.userSourceId
        || user[ SCIMConfigs.scim.systemSchema ]?.isReadOnlyUser === "true"
        || (user[ SCIMConfigs.scim.systemSchema ]?.managedOrg && !isUpdatingSharedProfilesFeatureEnabled);

    useEffect(() => {
        if (isSuperOrganization) {
            return;
        }

        const properties: ConnectorPropertyInterface[] = [];

        getGovernanceConnectors(ServerConfigurationsConstants.ACCOUNT_MANAGEMENT_CATEGORY_ID)
            .then((response: GovernanceConnectorInterface[]) => {
                response.map((connector: GovernanceConnectorInterface) => {
                    if (connector.id === ServerConfigurationsConstants.ACCOUNT_DISABLING_CONNECTOR_ID
                        || connector.id === ServerConfigurationsConstants.ADMIN_FORCE_PASSWORD_RESET_CONNECTOR_ID) {
                        connector.properties.map((property: ConnectorPropertyInterface) => {
                            properties.push(property);
                        });
                    }
                });

                getGovernanceConnectors(ServerConfigurationsConstants.USER_ONBOARDING_CONNECTOR_ID)
                    .then((response: GovernanceConnectorInterface[]) => {
                        response.map((connector: GovernanceConnectorInterface) => {
                            if (connector.id === ServerConfigurationsConstants.SELF_SIGN_UP_CONNECTOR_ID) {
                                connector.properties.map((property: ConnectorPropertyInterface) => {
                                    if (property.name === ServerConfigurationsConstants.ACCOUNT_LOCK_ON_CREATION) {
                                        properties.push(property);
                                    }
                                });
                            }
                        });

                        setConnectorProperties(properties);
                    });
            });

    }, []);

    useEffect(() => {
        const path: string[] = history.location.pathname.split("/");
        const id: string = path[ path.length - 1 ];

        getUser(id);
    }, []);

    const getUser = (id: string) => {
        setIsUserDetailsRequestLoading(true);

        getUserDetails(id, null)
            .then((response: ProfileInfoInterface) => {
                setUserProfile(response);
            })
            .catch(() => {
                // TODO add to notifications
            })
            .finally(() => {
                setIsUserDetailsRequestLoading(false);
            });
    };

    const handleUserUpdate = (id: string) => {
        getUser(id);

        if (UserManagementUtils.isAuthenticatedUser(profileInfo?.userName, user?.userName)) {
            dispatch(getProfileInformation());
        }
    };

    const handleBackButtonClick = () => {
        history.push(AppConstants.getPaths().get("CONSOLE_SETTINGS")
            + `#tab=${ ConsoleSettingsModes.ADMINISTRATORS }`);
    };

    /**
     * Handles edit avatar modal submit action.
     *
     * @param e - Mouse event.
     * @param url - Selected image URL.
     */
    const handleAvatarEditModalSubmit = (e: MouseEvent<HTMLButtonElement>, url: string): void => {
        const data: {
            Operations: {
                op: string;
                value: {
                    profileUrl: string;
                };
            }[];
            schemas: string[];
        } = {
            Operations: [
                {
                    op: "replace",
                    value: {
                        profileUrl: url
                    }
                }
            ],
            schemas: [ "urn:ietf:params:scim:api:messages:2.0:PatchOp" ]
        };

        setIsSubmitting(true);

        updateUserInfo(user?.id, data)
            .then(() => {
                dispatch(addAlert<AlertInterface>({
                    description: t(
                        "user:profile.notifications.updateProfileInfo.success.description"
                    ),
                    level: AlertLevels.SUCCESS,
                    message: t(
                        "user:profile.notifications.updateProfileInfo.success.message"
                    )
                }));

                handleUserUpdate(user?.id);
            })
            .catch((error: any) => {
                if (error.response
                    && error.response.data
                    && (error.response.data.description || error.response.data.detail)) {

                    dispatch(addAlert<AlertInterface>({
                        description: error.response.data.description || error.response.data.detail,
                        level: AlertLevels.ERROR,
                        message: t(
                            "user:profile.notifications.updateProfileInfo.error.message"
                        )
                    }));

                    return;
                }

                dispatch(addAlert<AlertInterface>({
                    description: t(
                        "user:profile.notifications.updateProfileInfo.genericError.description"
                    ),
                    level: AlertLevels.ERROR,
                    message: t(
                        "user:profile.notifications.updateProfileInfo.genericError.message"
                    )
                }));
            })
            .finally(() => {
                setShowEditAvatarModal(false);
                setIsSubmitting(false);
            });
    };

    /**
     * This function resolves the primary email of the user.
     *
     * @param emails - User emails.
     */
    const resolvePrimaryEmail = (emails: (string | MultiValueAttributeInterface)[]): string => {
        let primaryEmail: string | MultiValueAttributeInterface = "";

        if (emails && Array.isArray(emails) && emails.length > 0) {
            primaryEmail = emails.find((value: string | MultiValueAttributeInterface) => typeof value === "string");
        }

        return primaryEmail as string;
    };

    return (
        <UserManagementProvider>
            <TabPageLayout
                isLoading={ isUserDetailsRequestLoading }
                title={ (
                    <>
                        {
                            user?.active !== undefined
                                ? (
                                    <>
                                        {
                                            user?.active
                                                ? (
                                                    <Popup
                                                        trigger={ (
                                                            <Icon
                                                                className="mr-2 ml-0 vertical-aligned-baseline"
                                                                size="small"
                                                                name="circle"
                                                                color="green"
                                                            />
                                                        ) }
                                                        content={ t("common:enabled") }
                                                        inverted
                                                    />
                                                ) : (
                                                    <Popup
                                                        trigger={ (
                                                            <Icon
                                                                className="mr-2 ml-0 vertical-aligned-baseline"
                                                                size="small"
                                                                name="circle"
                                                                color="orange"
                                                            />
                                                        ) }
                                                        content={ t("common:disabled") }
                                                        inverted
                                                    />
                                                )
                                        }
                                        { resolveUserDisplayName(user, null, "Administrator") }

                                    </>
                                ) : (
                                    <>
                                        { resolveUserDisplayName(user, null, "Administrator") }
                                    </>
                                )
                        }
                    </>
                ) }
                pageTitle="Edit User"
                description={ t("" + user.emails && user.emails !== undefined ? resolvePrimaryEmail(user?.emails) :
                    user.userName) }
                image={ (
                    <UserAvatar
                        editable={ !isReadOnly }
                        hoverable={ !isReadOnly }
                        name={ resolveUserDisplayName(user) }
                        size="tiny"
                        image={ user?.profileUrl }
                        onClick={ () => !isReadOnly && setShowEditAvatarModal(true) }
                    />
                ) }
                loadingStateOptions={ {
                    count: 5,
                    imageType: "circular"
                } }
                backButton={ {
                    "data-testid": "user-mgt-edit-user-back-button",
                    onClick: handleBackButtonClick,
                    text: t("consoleSettings:administrators.edit.backButton")
                } }
                titleTextAlign="left"
                bottomMargin={ false }
                data-componentid={ componentId }
            >
                <EditUser
                    user={ user }
                    handleUserUpdate={ handleUserUpdate }
                    connectorProperties={ connectorProperties }
                    isLoading={ isUserDetailsRequestLoading }
                    isReadOnly={ isReadOnly }
                    isReadOnlyUserStore={ isReadOnlyUserStore }
                />
                {
                    showEditAvatarModal && (
                        <EditAvatarModal
                            open={ showEditAvatarModal }
                            name={ resolveUserDisplayName(user) }
                            emails={ resolveUserEmails(user?.emails) }
                            onClose={ () => setShowEditAvatarModal(false) }
                            closeOnDimmerClick={ false }
                            onCancel={ () => setShowEditAvatarModal(false) }
                            onSubmit={ handleAvatarEditModalSubmit }
                            imageUrl={ profileInfo?.profileUrl }
                            isSubmitting={ isSubmitting }
                            heading={ t("console:common.modals.editAvatarModal.heading") }
                            submitButtonText={ t("console:common.modals.editAvatarModal.primaryButton") }
                            cancelButtonText={ t("console:common.modals.editAvatarModal.secondaryButton") }
                            translations={ {
                                gravatar: {
                                    errors: {
                                        noAssociation: {
                                            content: (
                                                <Trans
                                                    i18nKey={
                                                        "console:common.modals.editAvatarModal.content.gravatar" +
                                                        "errors.noAssociation.content"
                                                    }
                                                >
                                                    It seems like the selected email is not registered on Gravatar.
                                                    Sign up for a Gravatar account by visiting
                                                    <a href="https://www.gravatar.com"> Gravatar Official Website</a>
                                                    or use one of the following.
                                                </Trans>
                                            ),
                                            header: t("console:common.modals.editAvatarModal.content.gravatar.errors" +
                                                ".noAssociation.header")
                                        }
                                    },
                                    heading: t("console:common.modals.editAvatarModal.content.gravatar.heading")
                                },
                                hostedAvatar: {
                                    heading: t("console:common.modals.editAvatarModal.content.hostedAvatar.heading"),
                                    input: {
                                        errors: {
                                            http: {
                                                content: t("console:common.modals.editAvatarModal.content." +
                                                    "hostedAvatar.input.errors.http.content"),
                                                header: t("console:common.modals.editAvatarModal.content." +
                                                    "hostedAvatar.input.errors.http.header")
                                            },
                                            invalid: {
                                                content: t("console:common.modals.editAvatarModal.content." +
                                                    "hostedAvatar.input.errors.invalid.content"),
                                                pointing: t("console:common.modals.editAvatarModal.content." +
                                                    "hostedAvatar.input.errors.invalid.pointing")
                                            }
                                        },
                                        hint: t(
                                            "console:common.modals.editAvatarModal.content.hostedAvatar.input.hint"
                                        ),
                                        placeholder: t("console:common.modals.editAvatarModal.content." +
                                            "hostedAvatar.input.placeholder"),
                                        warnings: {
                                            dataURL: {
                                                content: t("console:common.modals.editAvatarModal.content." +
                                                    "hostedAvatar.input.warnings.dataURL.content"),
                                                header: t("console:common.modals.editAvatarModal.content." +
                                                    "hostedAvatar.input.warnings.dataURL.header")
                                            }
                                        }
                                    }
                                },
                                systemGenAvatars: {
                                    heading: t(
                                        "console:common.modals.editAvatarModal.content.systemGenAvatars.heading"
                                    ),
                                    types: {
                                        initials: t("console:common.modals.editAvatarModal.content.systemGenAvatars." +
                                            "types.initials")
                                    }
                                }
                            } }
                        />
                    )
                }
            </TabPageLayout>
        </UserManagementProvider>
    );
};

export default ConsoleAdministratorsEditPage;
