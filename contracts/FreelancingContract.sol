// SPDX-License-Identifier: MIT
pragma solidity ^0.8.8;

import "./PriceAggregator.sol";


///@dev All the errors for saving gas
error FreelancingBasicContract__NotEmployer();
error FreelancingBasicContract__NotEmployee();
error FreelancingBasicContract__AlreadyApplied();
error FreelancingBasicContract__EmployerCantEmployHimself();
error FreelancingBasicContract__NotApplied();
error FreelancingBasicContract__JobNotApproved();
error FreelancingBasicContract__PayNotAccepted();
error FreelancingBasicContract__NotEnoughEtherProvided();
error FreelancingBasicContract__PayOnlyOnceAMonth();
error FreelancingBasicContract__CantDismissInTheFirstMonth();

/** @title A contract for a decentralized freelancing platform;
 * @author Vagner Dragos Andrei 
 * @notice This is a personal project
 */
contract FreelancingContract {
    //Set the price aggregator
    //Type declaration
    using PriceAggregator for uint;
    
    ///Basic data structure that is used to make new jobs on the platfrom
    ///dev State variables
    struct Job {
        address employer;
        string jobTitle;
        string jobDescription;
        uint256 payCheckInUsd;
        address pending;
        address employee;
        bool acceptPay;
        uint timePassed;
    }
    mapping(address => bool) private s_pending;
    mapping(uint => Job) public s_Jobs;
    mapping(address => uint) private s_timesHasBeenPaid;
    uint256 private s_numberOfListedJobs;

    
    // Modifiers
    modifier onlyEmployer(uint256 id) {
        Job memory job = s_Jobs[id];
        if(msg.sender != job.employer){
            revert FreelancingBasicContract__NotEmployer();
        }
        _;
    }

    modifier onlyEmployee(uint256 id) {
        Job memory job = s_Jobs[id];
        if(msg.sender != job.employee){
            revert FreelancingBasicContract__NotEmployee();
        }
        _;
    }

    /**
     * @dev This is the function to create new jobs
     * @dev Updates most of the struct
     * @param _jobTitle The title of the job that the employer needs
     * @param _jobDescription The description/requirements of the job
     * @return Return the number of the specific listed job so we can use it as an ID
     */
    function createJob(string memory _jobTitle, string memory _jobDescription) external returns(uint256) {
        Job storage job = s_Jobs[s_numberOfListedJobs];

        job.employer = msg.sender;
        job.jobTitle = _jobTitle;
        job.jobDescription = _jobDescription;
        s_numberOfListedJobs ++;

        return s_numberOfListedJobs - 1;
    }
    /**
     * @dev This function is used by employees to apply to a specific job
     * @param _id The id of the specific job listed
     */
    function applyJob(uint _id) external {
        Job storage job = s_Jobs[_id];
        if(s_pending[msg.sender]) {
            revert FreelancingBasicContract__AlreadyApplied();
        }   
        if(msg.sender == job.employer) {
            revert FreelancingBasicContract__EmployerCantEmployHimself();
        }    
        s_pending[msg.sender] = true;
        job.pending = msg.sender;
    }
    /**
     * @dev The function used by the creator of the job to accept a caditate
     * @param _candidate The address of the person who applied to a job
     * @param _id The id of the specific job
     */
    function approveJob(address _candidate, uint _id) external onlyEmployer(_id) {
        Job storage job = s_Jobs[_id];
        if(!s_pending[_candidate]) {
            revert FreelancingBasicContract__NotApplied();
        }
        job.pending = address(0);
        job.employee = _candidate;
        job.timePassed = block.timestamp + 30 days;
        s_pending[_candidate] = false;
    }
    /**
     * @dev The function used by the creator of the job to decline a canditate
     * @param _candidate The adress of the person who applied to a job 
     * @param _id The id of the specific job
     */
    function declineJob(address _candidate, uint _id) external onlyEmployer(_id) {
         Job storage job = s_Jobs[_id];
         if(!s_pending[_candidate]) {
            revert FreelancingBasicContract__NotApplied();
        }
        s_pending[_candidate] = false;
        job.pending = address(0);

    }
    /**
     * @dev The function used to set an amount of money to be payed by the employer to the employee
     * @param _value The amount of money the employer agreed to pay the employee in dolars
     * @param _id The id of the specific job
     */
    function setPayCheck(uint _value, uint _id) external  onlyEmployer(_id) {
        Job storage job = s_Jobs[_id];
        if(!checkStatus(_id)) {
            revert FreelancingBasicContract__JobNotApproved();
        }
        if(!job.acceptPay) {
            revert FreelancingBasicContract__PayNotAccepted();
        }
        job.payCheckInUsd = _value;
        job.acceptPay = false;
    }
    /**
     * @dev The function used by the employee to accept a change of the amount of money that he is paid
     * @param _id The Id of the specific job
     * @return Returns a boolean that changes the job struct
     */
    function acceptChangeOfPayCheck(uint256 _id) external onlyEmployee(_id) returns(bool){
        Job storage job = s_Jobs[_id];
        return job.acceptPay = true;
    }
    /**
     * @dev The function used by the employer to pay the employee every month
     * @param _id The id of the specific job
     */
    function payEmployee(uint256 _id) external payable onlyEmployer(_id) {
        Job storage job = s_Jobs[_id];
        uint payCheck = job.payCheckInUsd * 1e18;
        if(msg.value.getConversionRate() < payCheck) {
            revert FreelancingBasicContract__NotEnoughEtherProvided();
        }
        if(block.timestamp < job.timePassed) {
            revert FreelancingBasicContract__PayOnlyOnceAMonth();
        }
        job.timePassed = block.timestamp + 30 days;
        (bool success, ) = payable(job.employee).call { value: msg.value }("");
        require(success, "Transaction failed");
        s_timesHasBeenPaid[job.employee] ++;
    }
    /**
     * @dev The function used by the employer to dismiss the employee
     * @param _id The id of the specific job
     */
    function dismissEmployee(uint _id) external onlyEmployer(_id) {
        Job storage job = s_Jobs[_id];
        if(s_timesHasBeenPaid[job.employee] < 1) {
            revert FreelancingBasicContract__CantDismissInTheFirstMonth();
        }
        job.employee = address(0);
    }
    /**
     * @dev The function that is used to get the conversion rate for the ETH/USD
     * @param _id The id of the specific job
     * @return Returns the amount of WEI the employer needs to pay the employee so the payEmployee() function will not revert
     */
     function convertEthInUsd(uint _id) external view returns(uint){
        Job memory job = s_Jobs[_id];
        uint oneEth = 1;
        uint payCheck = job.payCheckInUsd * 1e18;
        return payCheck / oneEth.getConversionRate();
    }
    /**
     * @dev Function used internal to check if an employee exist at a specific job id
     * @param _id The is of the specific job
     * @return Returns a boolean that specific if an employee exists or not
     */
     function checkStatus(uint _id) internal view  returns(bool) {
        Job memory job = s_Jobs[_id];
        if(job.employee != address(0)) {
            return true;
        } return false;
    }

    ///Getter functions
    function getPendingStatus(address _candidate) public view returns(bool) {
        return s_pending[_candidate];
    }

    function getTimesHasBeenPaid(address _employee) public view returns(uint256) {
        return s_timesHasBeenPaid[_employee];
    }

    function getNumberOfListedJobs() public view returns(uint256) {
        return s_numberOfListedJobs;
    }

    function getJobs() public view returns(Job[] memory) {
        Job[] memory allJobs = new Job[](s_numberOfListedJobs);

        for(uint i=0; i<s_numberOfListedJobs; i++){
            Job storage job = s_Jobs[i];
            allJobs[i] = job;
        }
        return allJobs;
    }
    
    function getApplicant(uint _id) public view returns(address){
        Job memory job = s_Jobs[_id];
        return job.pending;
    }
}


