/**
 * Copyright (c) 2020, WSO2 LLC. (https://www.wso2.com). All Rights Reserved.
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

import { AccessControlConstants, Show } from "@wso2is/access-control";
import { AlertLevels, TestableComponentInterface } from "@wso2is/core/models";
import { addAlert } from "@wso2is/core/store";
import { I18n } from "@wso2is/i18n";
import {
    DocumentationLink,
    GridLayout,
    ListLayout,
    PageLayout,
    PrimaryButton,
    useDocumentation
} from "@wso2is/react-components";
import find from "lodash-es/find";
import React, {
    FunctionComponent,
    MouseEvent,
    ReactElement,
    ReactNode,
    SyntheticEvent,
    useEffect,
    useState
} from "react";
import { useTranslation } from "react-i18next";
import { useDispatch, useSelector } from "react-redux";
import {
    DropdownItemProps,
    DropdownProps,
    Icon,
    PaginationProps
} from "semantic-ui-react";
import {
    AdvancedSearchWithBasicFilters,
    AppConstants,
    AppState,
    ConfigReducerStateInterface,
    EventPublisher,
    FeatureConfigInterface,
    UIConstants,
    history
} from "../../core";
import { useApplicationList } from "../api";
import { ApplicationList, MinimalAppCreateWizard } from "../components";
import { ApplicationManagementConstants } from "../constants";
import CustomApplicationTemplate
    from "../data/application-templates/templates/custom-application/custom-application.json";
import { ApplicationListInterface } from "../models";

const APPLICATIONS_LIST_SORTING_OPTIONS: DropdownItemProps[] = [
    {
        key: 1,
        text: I18n.instance.t("common:name") as ReactNode,
        value: "name"
    },
    {
        key: 2,
        text: I18n.instance.t("common:type") as ReactNode,
        value: "type"
    },
    {
        key: 3,
        text: I18n.instance.t("common:createdOn") as ReactNode,
        value: "createdDate"
    },
    {
        key: 4,
        text: I18n.instance.t("common:lastUpdatedOn") as ReactNode,
        value: "lastUpdated"
    }
];

/**
 * Props for the Applications page.
 */
type ApplicationsPageInterface = TestableComponentInterface;

/**
 * Applications page.
 *
 * @param props - Props injected to the component.
 * @returns Applications listing page.
 */
const ApplicationsPage: FunctionComponent<ApplicationsPageInterface> = (
    props: ApplicationsPageInterface
): ReactElement => {

    const {
        [ "data-testid" ]: testId
    } = props;

    const { t } = useTranslation();
    const { getLink } = useDocumentation();

    const dispatch = useDispatch();

    const featureConfig: FeatureConfigInterface = useSelector((state: AppState) => state.config.ui.features);

    const [ searchQuery, setSearchQuery ] = useState<string>("");
    const [ listSortingStrategy, setListSortingStrategy ] = useState<DropdownItemProps>(
        APPLICATIONS_LIST_SORTING_OPTIONS[0]
    );
    const [ listOffset, setListOffset ] = useState<number>(0);
    const [ listItemLimit, setListItemLimit ] = useState<number>(UIConstants.DEFAULT_RESOURCE_LIST_ITEM_LIMIT);
    const [ triggerClearQuery, setTriggerClearQuery ] = useState<boolean>(false);
    const [ showWizard, setShowWizard ] = useState<boolean>(false);
    const config: ConfigReducerStateInterface = useSelector((state: AppState) => state.config);
    const [ isLoadingForTheFirstTime, setIsLoadingForTheFirstTime ] = useState<boolean>(true);

    const eventPublisher: EventPublisher = EventPublisher.getInstance();

    const {
        data: applicationList,
        isLoading: isApplicationListFetchRequestLoading,
        error: applicationListFetchRequestError,
        mutate: mutateApplicationListFetchRequest
    } = useApplicationList("advancedConfigurations,templateId,clientId,issuer", listItemLimit, listOffset, searchQuery);

    /**
     * Sets the initial spinner.
     * TODO: Remove this once the loaders are finalized.
     */
    useEffect(() => {
        if (isApplicationListFetchRequestLoading === false && isLoadingForTheFirstTime === true) {
            setIsLoadingForTheFirstTime(false);
        }
    }, [ isApplicationListFetchRequestLoading, isLoadingForTheFirstTime ]);

    /**
     * Handles the application list fetch request error.
     */
    useEffect(() => {

        if (!applicationListFetchRequestError) {
            return;
        }

        if (applicationListFetchRequestError.response
            && applicationListFetchRequestError.response.data
            && applicationListFetchRequestError.response.data.description) {
            dispatch(addAlert({
                description: applicationListFetchRequestError.response.data.description,
                level: AlertLevels.ERROR,
                message: t("console:develop.features.applications.notifications." +
                    "fetchApplications.error.message")
            }));

            return;
        }

        dispatch(addAlert({
            description: t("console:develop.features.applications.notifications.fetchApplications" +
                ".genericError.description"),
            level: AlertLevels.ERROR,
            message: t("console:develop.features.applications.notifications." +
                "fetchApplications.genericError.message")
        }));
    }, [ applicationListFetchRequestError ]);

    /**
     * Sets the list sorting strategy.
     *
     * @param event - The event.
     * @param data - Dropdown data.
     */
    const handleListSortingStrategyOnChange = (event: SyntheticEvent<HTMLElement>,
        data: DropdownProps): void => {
        setListSortingStrategy(find(APPLICATIONS_LIST_SORTING_OPTIONS, (option) => {
            return data.value === option.value;
        }));
    };

    /**
     * Checks if the `Next` page nav button should be shown.
     *
     * @param appList - List of applications.
     * @returns `true` if `Next` page nav button should be shown.
     */
    const shouldShowNextPageNavigation = (appList: ApplicationListInterface): boolean => {

        return appList?.startIndex + appList?.count !== appList?.totalResults + 1;
    };

    /**
     * Handles the `onFilter` callback action from the
     * application search component.
     *
     * @param query - Search query.
     */
    const handleApplicationFilter = (query: string): void => {
        setSearchQuery(query);
        setListOffset(0);
    };

    /**
     * Handles the pagination change.
     *
     * @param event - Mouse event.
     * @param data - Pagination component data.
     */
    const handlePaginationChange = (event: MouseEvent<HTMLAnchorElement>, data: PaginationProps): void => {
        setListOffset((data.activePage as number - 1) * listItemLimit);
    };

    /**
     * Handles per page dropdown page.
     *
     * @param event - Mouse event.
     * @param data - Dropdown data.
     */
    const handleItemsPerPageDropdownChange = (event: MouseEvent<HTMLAnchorElement>,
        data: DropdownProps): void => {
        setListItemLimit(data.value as number);
    };

    /**
     * Handles application delete action.
     */
    const handleApplicationDelete = (): void => {
        mutateApplicationListFetchRequest();
    };

    /**
     * Handles the `onSearchQueryClear` callback action.
     */
    const handleSearchQueryClear = (): void => {
        setSearchQuery("");
        setTriggerClearQuery(!triggerClearQuery);
    };

    return (
        <PageLayout
            pageTitle="Applications"
            action={
                (!isApplicationListFetchRequestLoading && !(!searchQuery && applicationList?.totalResults <= 0))
                && (
                    <Show when={ AccessControlConstants.APPLICATION_WRITE }>
                        <PrimaryButton
                            disabled={ isApplicationListFetchRequestLoading }
                            loading={ isApplicationListFetchRequestLoading }
                            onClick={ (): void => {
                                eventPublisher.publish("application-click-new-application-button");
                                history.push(AppConstants.getPaths().get("APPLICATION_TEMPLATES"));
                            } }
                            data-testid={ `${ testId }-list-layout-add-button` }
                        >
                            <Icon name="add" />
                            { t("console:develop.features.applications.list.actions.add") }
                        </PrimaryButton>
                    </Show>
                )
            }
            title={ t("console:develop.pages.applications.title") }
            description={ (
                <p>
                    { t("console:develop.pages.applications.subTitle") }
                    <DocumentationLink
                        link={ getLink("develop.applications.learnMore") }
                    >
                        { t("common:learnMore") }
                    </DocumentationLink>
                </p>
            ) }
            contentTopMargin={ (AppConstants.getTenant() === AppConstants.getSuperTenant()) }
            data-testid={ `${ testId }-page-layout` }
        >
            { !isLoadingForTheFirstTime ? (
                <>
                    <ListLayout
                        advancedSearch={ (
                            <AdvancedSearchWithBasicFilters
                                onFilter={ handleApplicationFilter }
                                filterAttributeOptions={ [
                                    {
                                        key: 0,
                                        text: t("common:name"),
                                        value: "name"
                                    },
                                    {
                                        key: 1,
                                        text: t("common:clientId"),
                                        value: "clientId"
                                    },
                                    {
                                        key: 2,
                                        text: t("common:issuer"),
                                        value: "issuer"
                                    }
                                ] }
                                filterAttributePlaceholder={
                                    t("console:develop.features.applications.advancedSearch.form" +
                                        ".inputs.filterAttribute.placeholder")
                                }
                                filterConditionsPlaceholder={
                                    t("console:develop.features.applications.advancedSearch.form" +
                                        ".inputs.filterCondition.placeholder")
                                }
                                filterValuePlaceholder={
                                    t("console:develop.features.applications.advancedSearch.form.inputs.filterValue" +
                                        ".placeholder")
                                }
                                placeholder={ t("console:develop.features.applications.advancedSearch.placeholder") }
                                style={ { minWidth: "425px" } }
                                defaultSearchAttribute="name"
                                defaultSearchOperator="co"
                                predefinedDefaultSearchStrategy={
                                    "name co %search-value% or clientId co %search-value% or issuer co %search-value%"
                                }
                                triggerClearQuery={ triggerClearQuery }
                                data-testid={ `${ testId }-list-advanced-search` }
                            />
                        ) }
                        currentListSize={ applicationList?.count }
                        listItemLimit={ listItemLimit }
                        onItemsPerPageDropdownChange={ handleItemsPerPageDropdownChange }
                        onPageChange={ handlePaginationChange }
                        onSortStrategyChange={ handleListSortingStrategyOnChange }
                        showPagination={ true }
                        showTopActionPanel={
                            isApplicationListFetchRequestLoading
                            || !(!searchQuery && applicationList?.totalResults <= 0) }
                        sortOptions={ APPLICATIONS_LIST_SORTING_OPTIONS }
                        sortStrategy={ listSortingStrategy }
                        totalPages={ Math.ceil(applicationList?.totalResults / listItemLimit) }
                        totalListSize={ applicationList?.totalResults }
                        paginationOptions={ {
                            disableNextButton: !shouldShowNextPageNavigation(applicationList)
                        } }
                        data-testid={ `${ testId }-list-layout` }
                    >
                        <ApplicationList
                            advancedSearch={ (
                                <AdvancedSearchWithBasicFilters
                                    onFilter={ handleApplicationFilter }
                                    filterAttributeOptions={ [
                                        {
                                            key: 0,
                                            text: t("common:name"),
                                            value: "name"
                                        },
                                        {
                                            key: 1,
                                            text: t("common:clientId"),
                                            value: "clientId"
                                        },
                                        {
                                            key: 2,
                                            text: t("common:issuer"),
                                            value: "issuer"
                                        }
                                    ] }
                                    filterAttributePlaceholder={
                                        t("console:develop.features.applications.advancedSearch." +
                                            "form.inputs.filterAttribute.placeholder")
                                    }
                                    filterConditionsPlaceholder={
                                        t("console:develop.features.applications.advancedSearch." +
                                            "form.inputs.filterCondition.placeholder")
                                    }
                                    filterValuePlaceholder={
                                        t("console:develop.features.applications.advancedSearch." +
                                            "form.inputs.filterValue.placeholder")
                                    }
                                    placeholder={
                                        t("console:develop.features.applications.advancedSearch.placeholder")
                                    }
                                    style={ { minWidth: "425px" } }
                                    defaultSearchAttribute="name"
                                    defaultSearchOperator="co"
                                    predefinedDefaultSearchStrategy={
                                        "name co %search-value% or clientId co %search-value% or " +
                                        "issuer co %search-value%"
                                    }
                                    triggerClearQuery={ triggerClearQuery }
                                    data-testid={ `${ testId }-list-advanced-search` }
                                />
                            ) }
                            featureConfig={ featureConfig }
                            isLoading={ isApplicationListFetchRequestLoading }
                            list={ applicationList }
                            onApplicationDelete={ handleApplicationDelete }
                            onEmptyListPlaceholderActionClick={
                                () => {
                                    history.push(AppConstants.getPaths().get("APPLICATION_TEMPLATES"));
                                }
                            }
                            onSearchQueryClear={ handleSearchQueryClear }
                            searchQuery={ searchQuery }
                            data-testid={ `${ testId }-list` }
                            data-componentid="application"
                        />
                    </ListLayout>
                    { showWizard && (
                        <MinimalAppCreateWizard
                            title={ CustomApplicationTemplate?.name }
                            subTitle={ CustomApplicationTemplate?.description }
                            closeWizard={ (): void => setShowWizard(false) }
                            template={ CustomApplicationTemplate }
                            showHelpPanel={ true }
                            subTemplates={ CustomApplicationTemplate?.subTemplates }
                            subTemplatesSectionTitle={ CustomApplicationTemplate?.subTemplatesSectionTitle }
                            addProtocol={ false }
                            templateLoadingStrategy={
                                config.ui.applicationTemplateLoadingStrategy
                                ?? ApplicationManagementConstants.DEFAULT_APP_TEMPLATE_LOADING_STRATEGY
                            }
                        />
                    ) }
                </>
            ) : (
                <GridLayout
                    isLoading={ isLoadingForTheFirstTime }
                />
            )
            }
        </PageLayout>
    );
};

/**
 * Default props for the component.
 */
ApplicationsPage.defaultProps = {
    "data-testid": "applications"
};

/**
 * A default export was added to support React.lazy.
 * TODO: Change this to a named export once react starts supporting named exports for code splitting.
 * @see {@link https://reactjs.org/docs/code-splitting.html#reactlazy}
 */
export default ApplicationsPage;
