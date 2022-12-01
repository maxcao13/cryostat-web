/*
 * Copyright The Cryostat Authors
 *
 * The Universal Permissive License (UPL), Version 1.0
 *
 * Subject to the condition set forth below, permission is hereby granted to any
 * person obtaining a copy of this software, associated documentation and/or data
 * (collectively the "Software"), free of charge and under any and all copyright
 * rights in the Software, and any and all patent rights owned or freely
 * licensable by each licensor hereunder covering either (i) the unmodified
 * Software as contributed to or provided by such licensor, or (ii) the Larger
 * Works (as defined below), to deal in both
 *
 * (a) the Software, and
 * (b) any piece of software and/or hardware listed in the lrgrwrks.txt file if
 * one is included with the Software (each a "Larger Work" to which the Software
 * is contributed by such licensors),
 *
 * without restriction, including without limitation the rights to copy, create
 * derivative works of, display, perform, and distribute the Software and make,
 * use, sell, offer for sale, import, export, have made, and have sold the
 * Software and the Larger Work(s), and to sublicense the foregoing rights on
 * either these or other terms.
 *
 * This license is subject to the following condition:
 * The above copyright notice and either this complete permission notice or at
 * a minimum a reference to the UPL must be included in all copies or
 * substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 */
import { authFailMessage, ErrorView, isAuthFail } from '@app/ErrorView/ErrorView';
import LoadingView from '@app/LoadingView/LoadingView';
import {
  automatedAnalysisAddFilterIntent,
  automatedAnalysisAddTargetIntent,
  automatedAnalysisDeleteAllFiltersIntent,
  automatedAnalysisDeleteCategoryFiltersIntent,
  automatedAnalysisDeleteFilterIntent,
} from '@app/Shared/Redux/AutomatedAnalysisFilterActions';
import { TargetAutomatedAnalysisFilters } from '@app/Shared/Redux/AutomatedAnalysisFilterReducer';
import { RootState, StateDispatch } from '@app/Shared/Redux/ReduxStore';
import { ArchivedRecording, automatedAnalysisRecordingName, Recording } from '@app/Shared/Services/Api.service';
import {
  CategorizedRuleEvaluations,
  FAILED_REPORT_MESSAGE,
  NO_RECORDINGS_MESSAGE,
  RECORDING_FAILURE_MESSAGE,
  RuleEvaluation,
} from '@app/Shared/Services/Report.service';
import { ServiceContext } from '@app/Shared/Services/Services';
import { automatedAnalysisConfigToRecordingAttributes } from '@app/Shared/Services/Settings.service';
import { NO_TARGET } from '@app/Shared/Services/Target.service';
import { useSubscriptions } from '@app/utils/useSubscriptions';
import {
  Button,
  Card,
  CardBody,
  CardExpandableContent,
  CardHeader,
  CardTitle,
  Checkbox,
  Grid,
  GridItem,
  LabelGroup,
  Stack,
  StackItem,
  Text,
  TextContent,
  TextVariants,
  Toolbar,
  ToolbarContent,
  ToolbarGroup,
  ToolbarItem,
  Tooltip,
} from '@patternfly/react-core';
import { PlusCircleIcon, Spinner2Icon, TrashIcon } from '@patternfly/react-icons';
import * as React from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { filter, finalize, first, map, tap } from 'rxjs';
import { AutomatedAnalysisConfigDrawer } from './AutomatedAnalysisConfigDrawer';
import {
  AutomatedAnalysisFilters,
  AutomatedAnalysisFiltersCategories,
  AutomatedAnalysisGlobalFiltersCategories,
  emptyAutomatedAnalysisFilters,
  filterAutomatedAnalysis,
} from './AutomatedAnalysisFilters';
import { clickableAutomatedAnalysisKey, ClickableAutomatedAnalysisLabel } from './ClickableAutomatedAnalysisLabel';
import { AutomatedAnalysisScoreFilter } from './Filters/AutomatedAnalysisScoreFilter';

interface AutomatedAnalysisCardProps {
}

export const AutomatedAnalysisCard: React.FunctionComponent<AutomatedAnalysisCardProps> = (props) => {
  const context = React.useContext(ServiceContext);
  const addSubscription = useSubscriptions();
  const dispatch = useDispatch<StateDispatch>();

  const [targetConnectURL, setTargetConnectURL] = React.useState('');
  const [categorizedEvaluation, setCategorizedEvaluation] = React.useState<CategorizedRuleEvaluations[]>([]);
  const [filteredCategorizedEvaluation, setFilteredCategorizedEvaluation] = React.useState<
    CategorizedRuleEvaluations[]
  >([]);
  const [isCardExpanded, setIsCardExpanded] = React.useState<boolean>(true);
  const [errorMessage, setErrorMessage] = React.useState<string | undefined>(undefined);
  const [isLoading, setIsLoading] = React.useState<boolean>(false);
  const [reportStalenessTimer, setReportStalenessTimer] = React.useState<number>(0);
  const [reportStalenessTimerUnits, setReportStalenessTimerUnits] = React.useState<string>('second');
  const [reportTime, setReportTime] = React.useState<number>(0);
  const [usingArchivedReport, setUsingArchivedReport] = React.useState<boolean>(false);
  const [usingCachedReport, setUsingCachedReport] = React.useState<boolean>(false);
  const [showNAScores, setShowNAScores] = React.useState<boolean>(false);

  const SECOND_MILLIS = 1000;
  const MINUTE_MILLIS = 60 * SECOND_MILLIS;
  const HOUR_MILLIS = 60 * MINUTE_MILLIS;
  const DAY_MILLIS = 24 * HOUR_MILLIS;

  const targetAutomatedAnalysisFilters = useSelector((state: RootState) => {
    const filters = state.automatedAnalysisFilters.state.targetFilters.filter(
      (targetFilter: TargetAutomatedAnalysisFilters) => targetFilter.target === targetConnectURL
    );
    return filters.length > 0 ? filters[0].filters : emptyAutomatedAnalysisFilters;
  }) as AutomatedAnalysisFiltersCategories;

  const targetAutomatedAnalysisGlobalFilters = useSelector((state: RootState) => {
    return state.automatedAnalysisFilters.state.globalFilters.filters;
  }) as AutomatedAnalysisGlobalFiltersCategories;

  const categorizeEvaluation = React.useCallback(
    (arr: RuleEvaluation[]) => {
      const map = new Map<string, RuleEvaluation[]>();
      arr.forEach((evaluation) => {
        const topicValue = map.get(evaluation.topic);
        if (topicValue === undefined) {
          map.set(evaluation.topic, [evaluation]);
        } else {
          topicValue.push(evaluation);
          topicValue.sort((a, b) => b.score - a.score || a.name.localeCompare(b.name));
        }
      });
      const sorted = (Array.from(map) as CategorizedRuleEvaluations[]).sort();
      setCategorizedEvaluation(sorted);
    },
    [setCategorizedEvaluation]
  );

  // Will perform analysis on  the first ActiveRecording which has
  // name: 'automated-analysis' ; label: 'origin=automated-analysis'
  const queryActiveRecordings = React.useCallback(
    (connectUrl: string) => {
      return context.api.graphql<any>(
        `
      query ActiveRecordingsForAutomatedAnalysis($connectUrl: String) {
        targetNodes(filter: { name: $connectUrl }) {
          recordings {
            active (filter: {
              name: "${automatedAnalysisRecordingName}",
              labels: ["origin=${automatedAnalysisRecordingName}"],
            }) {
              data {
                name
                downloadUrl
                reportUrl
                metadata {
                  labels
                }
              }
            }
          }
        }
      }`,
        { connectUrl }
      );
    },
    [context.api, context.api.graphql]
  );

  const queryArchivedRecordings = React.useCallback(
    (connectUrl: string) => {
      return context.api.graphql<any>(
        `
      query ArchivedRecordingsForAutomatedAnalysis($connectUrl: String) {
        archivedRecordings(filter: { sourceTarget: $connectUrl }) {
          data {
            name
            downloadUrl
            reportUrl
            metadata {
              labels
            }
            size
            archivedTime
          }
        }
      }`,
        { connectUrl }
      );
    },
    [context.api, context.api.graphql]
  );

  const handleStateErrors = React.useCallback(
    (errorMessage: string) => {
      setErrorMessage(errorMessage);
      setIsLoading(false);
      setUsingArchivedReport(false);
      setUsingCachedReport(false);
    },
    [setErrorMessage, setIsLoading, setUsingArchivedReport, setUsingCachedReport]
  );

  const handleLoading = React.useCallback(() => {
    setErrorMessage(undefined);
    setIsLoading(true);
    setUsingArchivedReport(false);
    setUsingCachedReport(false);
  }, [setErrorMessage, setIsLoading, setUsingArchivedReport, setUsingCachedReport]);

  const handleArchivedRecordings = React.useCallback(
    (recordings: ArchivedRecording[]) => {
      const freshestRecording = recordings.reduce((prev, current) =>
        prev?.archivedTime > current?.archivedTime ? prev : current
      );
      addSubscription(
        context.target.target().subscribe((target) => {
          context.reports
            .reportJson(freshestRecording, target.connectUrl)
            .pipe(first())
            .subscribe({
              next: (report) => {
                setUsingArchivedReport(true);
                setReportTime(freshestRecording.archivedTime);
                categorizeEvaluation(report);
              },
              error: (err) => {
                handleStateErrors(err.message);
              },
            });
        })
      );
    },
    [
      addSubscription,
      context.target,
      context.reports,
      categorizeEvaluation,
      handleStateErrors,
      setUsingArchivedReport,
      setReportTime,
    ]
  );

  // try generating report on cached or archived recordings
  const handleEmptyRecordings = React.useCallback(
    (connectUrl: string) => {
      const cachedReportAnalysis = context.reports.getCachedAnalysisReport(connectUrl);
      if (cachedReportAnalysis.report.length > 0) {
        setUsingCachedReport(true);
        setReportTime(cachedReportAnalysis.timestamp);
        categorizeEvaluation(cachedReportAnalysis.report);
      } else {
        addSubscription(
          queryArchivedRecordings(connectUrl)
            .pipe(
              first(),
              map((v) => v.data.archivedRecordings.data as ArchivedRecording[])
            )
            .subscribe({
              next: (recordings) => {
                if (recordings.length > 0) {
                  handleArchivedRecordings(recordings);
                } else {
                  handleStateErrors(NO_RECORDINGS_MESSAGE);
                }
              },
              error: (err) => {
                handleStateErrors(err.message);
              },
            })
        );
      }
    },
    [
      addSubscription,
      context.reports,
      categorizeEvaluation,
      queryArchivedRecordings,
      handleArchivedRecordings,
      handleStateErrors,
      setUsingCachedReport,
      setReportTime,
    ]
  );

  const generateReport = React.useCallback(() => {
    addSubscription(
      context.target.target()
      .pipe(
        filter((target) => target !== NO_TARGET),
        first(),
      )
      .subscribe((target) => {
        handleLoading();
        setTargetConnectURL(target.connectUrl);
        dispatch(automatedAnalysisAddTargetIntent(target.connectUrl));
        addSubscription(
          queryActiveRecordings(target.connectUrl)
            .pipe(
              finalize(() => setIsLoading(false)),
              first(),
              tap((resp) => {
                if (resp.errors) {
                  context.target.setAuthFailure();
                  throw new Error(authFailMessage);
                }
              }),
              map((v) => v.data.targetNodes[0].recordings.active.data[0] as Recording),
              tap((recording) => {
                if (recording === null || recording === undefined) {
                  throw new Error(NO_RECORDINGS_MESSAGE);
                }
              })
            )
            .subscribe({
              next: (recording) => {
                context.reports
                  .reportJson(recording, target.connectUrl)
                  .pipe(first())
                  .subscribe({
                    next: (report) => {
                      categorizeEvaluation(report);
                    },
                    error: (_) => {
                      handleStateErrors(FAILED_REPORT_MESSAGE);
                    },
                  });
              },
              error: (err) => {
                if (isAuthFail(err.message)) {
                  context.target.setAuthRetry();
                  handleStateErrors(authFailMessage);
                } else {
                  handleEmptyRecordings(target.connectUrl);
                }
              },
            })
        );
      })
    );
  }, [
    addSubscription,
    dispatch,
    context.api,
    context.target,
    context.reports,
    automatedAnalysisAddTargetIntent,
    setTargetConnectURL,
    setIsLoading,
    categorizeEvaluation,
    queryActiveRecordings,
    handleEmptyRecordings,
    handleLoading,
    handleStateErrors,
  ]);

  const startProfilingRecording = React.useCallback(() => {
    const config = context.settings.automatedAnalysisRecordingConfig();
    const attributes = automatedAnalysisConfigToRecordingAttributes(config);
    addSubscription(
      context.api.createRecording(attributes).subscribe((resp) => {
        if (resp && (resp.ok || resp.status === 400)) {
          // in-case the recording already exists
          generateReport();
        } else {
          handleStateErrors(RECORDING_FAILURE_MESSAGE);
        }
      })
    );
  }, [
    addSubscription,
    context.api,
    context.settings,
    context.settings.automatedAnalysisRecordingConfig,
    generateReport,
    handleStateErrors,
  ]);

  const getMessageAndRetry = React.useCallback((errorMessage: string | undefined): [string | undefined, undefined | (() => void)] => {
    if (errorMessage) {
      if (errorMessage === NO_RECORDINGS_MESSAGE) {
        return [undefined, undefined];
      } else if (isAuthFail(errorMessage)) {
        return ['Retry auth', generateReport];
      } else if (errorMessage === RECORDING_FAILURE_MESSAGE) {
        return ['Retry starting recording', startProfilingRecording];
      } else if (errorMessage === FAILED_REPORT_MESSAGE) {
        return ['Retry loading report', generateReport];
      } else {
        return ['Retry', generateReport];
      }
    }
    return [undefined, undefined];
  }, [startProfilingRecording, generateReport]);

  React.useEffect(() => {
    addSubscription(
      context.target.authFailure().subscribe(() => {
        handleStateErrors(authFailMessage);
      })
    );
  }, [addSubscription, context.target, handleStateErrors]);

  React.useEffect(() => {
    context.target.target().subscribe((target) => {
      setTargetConnectURL(target.connectUrl);
      dispatch(automatedAnalysisAddTargetIntent(target.connectUrl));
      generateReport();
    });
  }, [context.target, generateReport, setTargetConnectURL, dispatch]);

  React.useEffect(() => {
    if (reportTime == 0 || !(usingArchivedReport || usingCachedReport)) {
      return;
    }
    let interval, timerQuantity;
    let now = Date.now();
    const reportMillis = now - reportTime;
    if (reportMillis < MINUTE_MILLIS) {
      timerQuantity = Math.round(reportMillis / SECOND_MILLIS);
      interval = SECOND_MILLIS - (reportMillis % SECOND_MILLIS);
      setReportStalenessTimerUnits('second');
    } else if (reportMillis < HOUR_MILLIS) {
      timerQuantity = Math.round(reportMillis / MINUTE_MILLIS);
      interval = MINUTE_MILLIS - (reportMillis % MINUTE_MILLIS);
      setReportStalenessTimerUnits('minute');
    } else if (reportMillis < DAY_MILLIS) {
      timerQuantity = Math.round(reportMillis / HOUR_MILLIS);
      interval = HOUR_MILLIS - (reportMillis % HOUR_MILLIS);
      setReportStalenessTimerUnits('hour');
    } else {
      timerQuantity = Math.round(reportMillis / DAY_MILLIS);
      interval = DAY_MILLIS - reportMillis * DAY_MILLIS;
      setReportStalenessTimerUnits('day');
    }
    setReportStalenessTimer(timerQuantity);
    const timer = setInterval(() => {
      setReportStalenessTimer((reportStalenessTimer) => reportStalenessTimer + 1);
    }, interval);
    return () => clearInterval(timer);
  }, [
    setReportStalenessTimer,
    setReportStalenessTimerUnits,
    reportTime,
    reportStalenessTimer,
    usingArchivedReport,
    usingCachedReport,
  ]);

  React.useEffect(() => {
    setFilteredCategorizedEvaluation(
      filterAutomatedAnalysis(
        categorizedEvaluation,
        targetAutomatedAnalysisFilters,
        targetAutomatedAnalysisGlobalFilters,
        showNAScores
      )
    );
  }, [
    categorizedEvaluation,
    targetAutomatedAnalysisFilters,
    targetAutomatedAnalysisGlobalFilters,
    showNAScores,
    filterAutomatedAnalysis,
    setFilteredCategorizedEvaluation,
  ]);

  const onCardExpand = React.useCallback(() => {
    setIsCardExpanded(isCardExpanded => !isCardExpanded);
  }, [setIsCardExpanded]);

  const handleNAScoreChange = React.useCallback(
    (checked: boolean) => {
      setShowNAScores(checked);
    },
    [setShowNAScores]
  );

  const filteredCategorizedLabels = React.useMemo(() => {
    return (
      <Grid>
        {filteredCategorizedEvaluation
          .filter(([_, evaluations]) => evaluations.length > 0)
          .map(([topic, evaluations]) => {
            return (
              <GridItem className="automated-analysis-grid-item" span={3} key={`gridItem-${topic}`}>
                <LabelGroup categoryName={topic} isVertical numLabels={3} isCompact key={`topic-${topic}`}>
                  {evaluations.map((evaluation) => {
                    return (
                      <ClickableAutomatedAnalysisLabel
                        label={evaluation}
                        isSelected={false}
                        key={clickableAutomatedAnalysisKey}
                      />
                    );
                  })}
                </LabelGroup>
              </GridItem>
            );
          })}
      </Grid>
    );
  }, [filteredCategorizedEvaluation]);

  const clearCacheStartRecording = React.useCallback(() => {
    addSubscription(
      context.target.target().pipe(first()).subscribe((target) => {
        context.reports.deleteCachedAnalysisReport(target.connectUrl);
        startProfilingRecording();
      })
    );
  }, [addSubscription, context.target, context.reports, startProfilingRecording]);

  const clearAnalysis = React.useCallback(() => {
    if (usingArchivedReport) {
      // do nothing, we don't want to delete unrelated archived reports
      return;
    }
    setIsLoading(true);
    context.reports.deleteCachedAnalysisReport(targetConnectURL);
    if (usingCachedReport) {
      handleStateErrors(NO_RECORDINGS_MESSAGE);
    }
    else {
      addSubscription(
        context.api.deleteRecording('automated-analysis').subscribe({
          next: () => {
            handleStateErrors(NO_RECORDINGS_MESSAGE);
          },
          error: (error) => {
            handleStateErrors(error.message);
          }
        })
      );
    }
  }, [
    addSubscription,
    context.api,
    context.reports,
    targetConnectURL,
    usingCachedReport,
    usingArchivedReport,
    setIsLoading,
    handleStateErrors,
  ]);

  const updateFilters = React.useCallback(
    (target, { filterValue, filterKey, deleted = false, deleteOptions }) => {
      if (deleted) {
        if (deleteOptions && deleteOptions.all) {
          dispatch(automatedAnalysisDeleteCategoryFiltersIntent(target, filterKey));
        } else {
          dispatch(automatedAnalysisDeleteFilterIntent(target, filterKey, filterValue));
        }
      } else {
        dispatch(automatedAnalysisAddFilterIntent(target, filterKey, filterValue));
      }
    },
    [
      dispatch,
      automatedAnalysisDeleteCategoryFiltersIntent,
      automatedAnalysisDeleteFilterIntent,
      automatedAnalysisAddFilterIntent,
    ]
  );

  const handleClearFilters = React.useCallback(() => {
    dispatch(automatedAnalysisDeleteAllFiltersIntent(targetConnectURL));
  }, [dispatch, automatedAnalysisDeleteAllFiltersIntent, targetConnectURL]);

  const reportStalenessText = React.useMemo(() => {
    if (isLoading || !(usingArchivedReport || usingCachedReport)) {
      return undefined;
    }
    return (
      <TextContent>
        <Text className="stale-report-text" component={TextVariants.p}>
          {(usingArchivedReport ? 'Showing archived report from ' : 'Showing cached report from ') +
            `from ${reportStalenessTimer} ${reportStalenessTimerUnits}${reportStalenessTimer > 1 ? 's' : ''} ago.`}
          <Tooltip
            content={
              (usingArchivedReport ? 'Automatically' : 'Clear cached report and automatically') +
              ' create active recording for updated analysis.'
            }
          >
            <Button
              aria-label="Create default recording"
              variant="plain"
              isInline
              isSmall
              icon={<PlusCircleIcon />}
              onClick={usingArchivedReport ? startProfilingRecording : clearCacheStartRecording}
            />
          </Tooltip>
        </Text>
      </TextContent>
    );
  }, [
    isLoading,
    usingArchivedReport,
    usingCachedReport,
    reportStalenessTimer,
    reportStalenessTimerUnits,
    clearCacheStartRecording,
    startProfilingRecording,
  ]);

  const toolbar = React.useMemo(() => {
    return (
      <Toolbar
        id="automated-analysis-toolbar"
        aria-label="automated-analysis-toolbar"
        clearAllFilters={handleClearFilters}
        clearFiltersButtonText="Clear all filters"
        isFullHeight
      >
        <ToolbarContent>
          <AutomatedAnalysisFilters
            target={targetConnectURL}
            evaluations={categorizedEvaluation}
            filters={targetAutomatedAnalysisFilters}
            updateFilters={updateFilters}
          />
          <ToolbarGroup>
            <ToolbarItem>
              <Button
                isSmall
                isAriaDisabled={isLoading || usingCachedReport || usingArchivedReport}
                aria-label="Refresh automated analysis"
                onClick={generateReport}
                variant="control"
                icon={<Spinner2Icon />}
              />
              <Button
                isSmall
                isAriaDisabled={isLoading || usingArchivedReport}
                aria-label="Delete automated analysis"
                onClick={clearAnalysis}
                variant="control"
                icon={<TrashIcon />}
              />
            </ToolbarItem>
            <ToolbarItem>
              <Checkbox
                label="Show N/A scores"
                isChecked={showNAScores}
                onChange={handleNAScoreChange}
                id="show-na-scores"
                name="show-na-scores"
              />
            </ToolbarItem>
          </ToolbarGroup>
        </ToolbarContent>
      </Toolbar>
    );
  }, [
    isLoading,
    showNAScores,
    targetConnectURL,
    categorizedEvaluation,
    targetAutomatedAnalysisFilters,
    generateReport,
    handleClearFilters,
    handleNAScoreChange,
    updateFilters,
  ]);

  const errorView = React.useMemo(() => {
    return (
      <ErrorView
        title={'Automated Analysis Error'}
        message={
          <TextContent>
            <Text component={TextVariants.p}>Cryostat was unable to generate an automated analysis report.</Text>
            <Text component={TextVariants.small}>{errorMessage}</Text>
          </TextContent>
        }
        retryButtonMessage={getMessageAndRetry(errorMessage)[0]}
        retry={getMessageAndRetry(errorMessage)[1]}
      />
    );
  }, [errorMessage, getMessageAndRetry]);

  const view = React.useMemo(() => {
    if (errorMessage) {
      if (isAuthFail(errorMessage)) {
        return errorView;
      }
      return <AutomatedAnalysisConfigDrawer onCreate={generateReport} drawerContent={errorView} />;
    } else if (isLoading) {
      return <LoadingView />;
    } else {
      return filteredCategorizedLabels;
    }
  }, [filteredCategorizedLabels, isLoading, errorMessage, errorView, generateReport]);

  return (
    <Card id="automated-analysis-card" isRounded isCompact isExpanded={isCardExpanded}>
      <CardHeader
        isToggleRightAligned
        onExpand={onCardExpand}
        toggleButtonProps={{
          id: 'automated-analysis-toggle-details',
          'aria-label': 'Details',
          'aria-labelledby': 'automated-analysis-card-title toggle-details',
          'aria-expanded': isCardExpanded,
        }}
      >
        <CardTitle component="h4">Automated Analysis</CardTitle>
      </CardHeader>
      <CardExpandableContent>
        <Stack hasGutter>
          <StackItem>
            {errorMessage ? null : toolbar}
          </StackItem>
          <StackItem className="automated-analysis-score-filter-stack-item">
            {errorMessage ? null : (
              <AutomatedAnalysisScoreFilter targetConnectUrl={targetConnectURL}> </AutomatedAnalysisScoreFilter>
            )}
          </StackItem>
          <StackItem>
            <CardBody isFilled={true}>
              {reportStalenessText}
              {view}
            </CardBody>
          </StackItem>
        </Stack>
      </CardExpandableContent>
    </Card>
  );
};
