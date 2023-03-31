import React, { useEffect, useMemo, useState } from 'react';
import {
    Keyboard,
    Modal,
    ModalProps,
    Pressable,
    StyleSheet,
    TextInput,
    View,
    useWindowDimensions,
} from 'react-native';
import Animated, {
    Easing,
    runOnJS,
    useSharedValue,
    withTiming,
} from 'react-native-reanimated';
import { Task } from '../../api/types';
import { useUpdateTask } from '../../api/useUpdateTask';
import { colors, spacing } from '../../theme';
import { Backdrop } from '../Backdrop';
import { Checkbox } from '../Checkbox';
import {
    ArrowBackIcon,
    DescriptionIcon,
    InboxIcon,
    MoreVerticalIcon,
} from '../Icons';
import { MyText } from '../MyText';
import { TaskDueDate } from '../TaskDueDate';

export type ViewTaskModalProps = {
    /**
     * Task information, can be null if no task has been pressed yet
     */
    task: Task | null;
    /**
     * Callback fired when the modal is closed
     */
    onClose: () => void;
} & Pick<ModalProps, 'visible'>;

const INITIAL_HEIGHT = 200;

const ViewTaskModal: React.FC<ViewTaskModalProps> = (props) => {
    const { task, visible, onClose } = props;
    const { height: windowHeight } = useWindowDimensions();
    const [editView, setEditView] = useState(false);
    const [viewExpanded, setViewExpanded] = useState(false);
    const [taskName, setTaskName] = useState(task?.name ?? '');
    const [taskDescription, setTaskDescription] = useState(
        task?.description ?? ''
    );

    const disableSave = useMemo(() => {
        // No task name provided
        if (taskName.length === 0) {
            return true;
        }

        // Task name has not changed
        if (
            task?.name === taskName &&
            (task?.description ?? '') === taskDescription
        ) {
            return true;
        }

        return false;
    }, [task, taskName, taskDescription]);

    const sharedHeight = useSharedValue(INITIAL_HEIGHT);

    const { mutate } = useUpdateTask();

    // TODO: Make the animation work well in the future. Hard to delay the keyboard opening.
    // const animatedStyles = useAnimatedStyle(() => {
    //     return { height: sharedHeight.value };
    // });

    /**
     * Helper function to expand the modal
     */
    const updateViewExpanded = () => {
        setViewExpanded(true);
    };

    /**
     * Handles saving the changes
     */
    const handleUpdateTask = () => {
        if (!task || disableSave) {
            return;
        }

        mutate({
            id: task.id,
            name: taskName.trim(),
            description: taskDescription.trim() || null,
        });

        // Trim state values
        setTaskName(taskName.trim());
        setTaskDescription(taskDescription.trim());

        // Go back to view modal
        setEditView(false);
    };

    useEffect(() => {
        if (editView && !viewExpanded) {
            sharedHeight.value = withTiming(
                windowHeight,
                {
                    duration: 400,
                    easing: Easing.out(Easing.exp),
                },
                (isFinished) => {
                    if (isFinished) {
                        runOnJS(updateViewExpanded)();
                    }
                }
            );
        }

        // Make sure to dismiss the keyboard if on "View"
        if (!editView) {
            Keyboard.dismiss();
        }
    }, [editView, sharedHeight, viewExpanded, windowHeight]);

    // If the keyboard is dismissed on "Edit", return to the "View"
    useEffect(() => {
        const hideSubscription = Keyboard.addListener('keyboardDidHide', () => {
            if (editView) {
                setEditView(false);
            }
        });

        return () => {
            hideSubscription.remove();
        };
    }, [editView]);

    const handleRequestClose = () => {
        if (editView) {
            setEditView(false);
            return;
        }

        onClose();
    };

    if (!task) {
        return null;
    }

    return (
        <Modal
            visible={visible}
            transparent
            animationType="fade"
            onRequestClose={handleRequestClose}
        >
            <Backdrop onClose={onClose}>
                <Pressable>
                    <Animated.View
                        style={[
                            styles.container,
                            viewExpanded ? { height: '100%' } : undefined,
                            // viewExpanded ? { height: '100%' } : animatedStyles,
                            viewExpanded ? styles.containerExpanded : undefined,
                        ]}
                    >
                        <View
                            style={{
                                flexDirection: 'row',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                marginBottom: spacing(4),
                            }}
                        >
                            {editView ? (
                                <EditHeader
                                    disableSave={disableSave}
                                    onBack={() => setEditView(false)}
                                    onSave={handleUpdateTask}
                                />
                            ) : (
                                <ViewHeader />
                            )}
                        </View>

                        <Checkbox
                            label={taskName}
                            value={taskName}
                            onChangeText={setTaskName}
                            checked={task.completed}
                            editable
                            onInputFocus={() => setEditView(true)}
                        />

                        {(editView || task?.description) && (
                            <View
                                style={{
                                    marginTop: spacing(3.5),
                                    marginRight: spacing(2),
                                    flexDirection: 'row',
                                }}
                            >
                                <DescriptionIcon
                                    style={{ marginTop: spacing(0.5) }}
                                />
                                <TextInput
                                    multiline
                                    value={taskDescription}
                                    onChangeText={setTaskDescription}
                                    maxLength={200}
                                    placeholder="Description"
                                    defaultValue={task?.description || ''}
                                    onFocus={() => setEditView(true)}
                                    style={{
                                        marginLeft: spacing(2),
                                        width: '100%',
                                        flexShrink: 1,
                                    }}
                                />
                            </View>
                        )}

                        {!editView && (
                            <View style={styles.dueDateContainer}>
                                <TaskDueDate
                                    dueDate={task.due_date}
                                    size="lg"
                                    defaultColorText
                                />
                            </View>
                        )}
                    </Animated.View>
                </Pressable>
            </Backdrop>
        </Modal>
    );
};

const ViewHeader = () => {
    return (
        <>
            <View
                style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    marginLeft: 4,
                }}
            >
                <InboxIcon fill={colors.inbox} width="16" height="16" />
                <MyText
                    color="secondary"
                    style={{ marginLeft: 4 + spacing(2) }}
                >
                    Inbox
                </MyText>
            </View>

            <MoreVerticalIcon width="20" height="20" />
        </>
    );
};

const EditHeader: React.FC<{
    onBack: () => void;
    disableSave: boolean;
    onSave: () => void;
}> = (props) => {
    return (
        <>
            <View
                style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                }}
            >
                <Pressable onPress={props.onBack}>
                    <ArrowBackIcon />
                </Pressable>
                <MyText style={{ marginLeft: spacing(2) }}>Edit task</MyText>
            </View>
            <Pressable onPress={props.onSave} disabled={props.disableSave}>
                <MyText color={props.disableSave ? 'disabled' : 'primary'}>
                    Save
                </MyText>
            </Pressable>
        </>
    );
};

const styles = StyleSheet.create({
    container: {
        backgroundColor: colors.background,
        padding: spacing(4),
        borderTopLeftRadius: 16,
        borderTopRightRadius: 16,
    },
    containerExpanded: {
        borderTopLeftRadius: 0,
        borderTopRightRadius: 0,
    },
    dueDateContainer: {
        marginTop: spacing(4),
    },
});

export default ViewTaskModal;
